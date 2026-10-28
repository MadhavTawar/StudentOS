import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';

const isStudentOsTaskQuestion = (prompt) => {
  const lower = prompt.toLowerCase();
  const wordBoundary = (word) => {
    const regex = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    return regex.test(lower);
  };
  return (
    wordBoundary('task') || wordBoundary('tasks') || wordBoundary('deadline') || wordBoundary('deadlines') ||
    wordBoundary('goal') || wordBoundary('goals') || wordBoundary('homework') || wordBoundary('assignment') ||
    wordBoundary('assignments') || wordBoundary('exam') || wordBoundary('exams') || wordBoundary('due') ||
    wordBoundary('overdue') || wordBoundary('schedule') ||
    lower.includes('study plan') || lower.includes('work on') || lower.includes('my tasks') ||
    lower.includes('what should i work on') || lower.includes('due this week')
  );
};

export function render() {
  const container = document.createElement('section');
  container.className = 'learn-page';

  let library = [];
  let selectedDocumentId = library[0]?.id ?? '';
  let selectedVersionId = library[0]?.version_id ?? '';
  let preview = null;
  let previewPage = 1;
  let activePanel = 'documents';
  let access = null;
  let aiProvider = null;
  let turns = [];
  let question = '';
  let isLoadingLibrary = true;
  let isAsking = false;
  let error = '';
  let chatError = '';
  let libraryLoadStarted = false;
  let previewRequestId = 0;
  let chatRequestId = 0;

  const replacePreview = (nextPreview) => {
    if (preview?.url && preview.url !== nextPreview?.url) {
      URL.revokeObjectURL(preview.url);
    }
    preview = nextPreview;
  };

  function renderPage() {
  container.replaceChildren();

  const header = document.createElement('header');
  header.className = 'learn-header';
  const brand = document.createElement('div');
  brand.className = 'learn-brand';
  brand.appendChild(icon('bookOpen'));
  const h1 = document.createElement('h1');
  h1.textContent = 'Learn';
  brand.appendChild(h1);
  const headerActions = document.createElement('div');
  headerActions.className = 'learn-header-actions';
  if (access?.can_manage_documents) {
    const link = document.createElement('a');
    link.className = 'btn btn-outline knowledge-manage-link';
    link.href = '/app/knowledge/manage';
    link.textContent = 'Manage library';
    link.onclick = (e) => { e.preventDefault(); router.navigate('/app/knowledge/manage'); };
    headerActions.appendChild(link);
  }
  header.appendChild(brand);
  header.appendChild(headerActions);
  container.appendChild(header);

  const tabs = document.createElement('div');
  tabs.className = 'learn-mobile-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Learn workspace panels');
  ['documents', 'reader', 'chat'].forEach((panel) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `learn-tab-${panel}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `learn-panel-${panel}`);
    btn.setAttribute('aria-selected', activePanel === panel);
    btn.textContent = panel.charAt(0).toUpperCase() + panel.slice(1);
    btn.onclick = () => { activePanel = panel; renderPage(); };
    tabs.appendChild(btn);
  });
  container.appendChild(tabs);

  const layout = document.createElement('div');
  layout.className = 'learn-layout';
  layout.setAttribute('data-active-panel', activePanel);

  // Documents panel
  const docsPanel = document.createElement('aside');
  docsPanel.id = 'learn-panel-documents';
  docsPanel.setAttribute('role', 'tabpanel');
  docsPanel.setAttribute('aria-labelledby', 'learn-tab-documents');
  docsPanel.className = 'learn-documents-panel';
  docsPanel.setAttribute('aria-label', 'Published workspace documents');
  const docsHeading = document.createElement('div');
  docsHeading.className = 'learn-panel-heading';
  const docsIcon = document.createElement('div');
  docsIcon.className = 'learn-panel-icon';
  docsIcon.appendChild(icon('fileText'));
  const docsInfo = document.createElement('div');
  const docsH2 = document.createElement('h2');
  docsH2.textContent = 'Library';
  const docsP = document.createElement('p');
  docsP.textContent = `${library.length} published ${library.length === 1 ? 'document' : 'documents'}`;
  docsInfo.appendChild(docsH2);
  docsInfo.appendChild(docsP);
  docsHeading.appendChild(docsIcon);
  docsHeading.appendChild(docsInfo);
  docsPanel.appendChild(docsHeading);

  if (error) {
    const err = document.createElement('p');
    err.className = 'knowledge-error';
    err.setAttribute('role', 'alert');
    err.textContent = error;
    docsPanel.appendChild(err);
  }

  if (isLoadingLibrary) {
    const p = document.createElement('p');
    p.className = 'learn-library-empty';
    p.textContent = 'Loading the published library…';
    docsPanel.appendChild(p);
  } else if (library.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'learn-library-empty';
    if (access?.can_manage_documents) {
      const p = document.createElement('p');
      p.textContent = 'Upload your notes or course PDFs, publish them, then ask questions with sources.';
      const link = document.createElement('a');
      link.className = 'btn btn-primary knowledge-upload-cta';
      link.href = '/app/knowledge/manage';
      link.textContent = 'Upload your first document';
      link.onclick = (e) => { e.preventDefault(); router.navigate('/app/knowledge/manage'); };
      empty.appendChild(p);
      empty.appendChild(link);
    } else {
      empty.textContent = 'Nothing has been published in this workspace yet. Ask the workspace owner to add study material.';
    }
    docsPanel.appendChild(empty);
  } else {
    const grouped = new Map();
    library.forEach((item) => {
      const arr = grouped.get(item.category) || [];
      arr.push(item);
      grouped.set(item.category, arr);
    });
    Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([category, items]) => {
      const group = document.createElement('section');
      group.className = 'learn-category-group';
      const h3 = document.createElement('h3');
      h3.className = 'learn-category-title';
      h3.textContent = `${category} (${items.length})`;
      group.appendChild(h3);
      const ul = document.createElement('ul');
      ul.className = 'learn-document-list';
      items.forEach((document) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `learn-document-select${selectedDocumentId === document.id ? ' is-selected' : ''}`;
        btn.setAttribute('aria-pressed', selectedDocumentId === document.id);
        btn.onclick = () => {
          selectedDocumentId = document.id;
          selectedVersionId = document.version_id;
          replacePreview(null);
          activePanel = 'reader';
          previewPage = 1;
          renderPage();
        };
        const catSpan = document.createElement('span');
        catSpan.className = 'learn-document-category';
        catSpan.textContent = document.category;
        const strong = document.createElement('strong');
        strong.textContent = document.title;
        btn.appendChild(catSpan);
        btn.appendChild(strong);
        if (document.description) {
          const desc = document.createElement('span');
          desc.className = 'learn-document-description';
          desc.textContent = document.description;
          btn.appendChild(desc);
        }
        const small = document.createElement('small');
        small.textContent = `Version ${document.version_number}${document.page_count > 0 ? ` · ${document.page_count} pages` : ''}`;
        btn.appendChild(small);
        li.appendChild(btn);
        ul.appendChild(li);
      });
      group.appendChild(ul);
      docsPanel.appendChild(group);
    });
    const footnote = document.createElement('p');
    footnote.className = 'learn-library-footnote';
    footnote.textContent = 'Only current, published documents are searchable. Archived or superseded versions are excluded.';
    docsPanel.appendChild(footnote);
  }
  layout.appendChild(docsPanel);

  // Reader panel
  const readerPanel = document.createElement('section');
  readerPanel.id = 'learn-panel-reader';
  readerPanel.setAttribute('role', 'tabpanel');
  readerPanel.setAttribute('aria-labelledby', 'learn-tab-reader');
  readerPanel.className = 'learn-reader-panel';
  readerPanel.setAttribute('aria-label', 'Selected document');

  const selectedDocument = library.find((item) => item.id === selectedDocumentId) || library[0] || null;
  const previewVersionId = selectedVersionId || selectedDocument?.version_id || '';

  if (!selectedDocument) {
    const empty = document.createElement('div');
    empty.className = 'learn-reader-empty';
    empty.appendChild(icon('bookOpen'));
    const h2 = document.createElement('h2');
    h2.textContent = 'Select a published document';
    const p = document.createElement('p');
    p.textContent = 'Choose a document from the workspace library to inspect its details.';
    empty.appendChild(h2);
    empty.appendChild(p);
    readerPanel.appendChild(empty);
  } else {
    const heading = document.createElement('div');
    heading.className = 'learn-reader-heading';
    const info = document.createElement('div');
    const catSpan = document.createElement('span');
    catSpan.className = 'learn-document-category';
    catSpan.textContent = selectedDocument.category;
    const h2 = document.createElement('h2');
    h2.textContent = selectedDocument.title;
    const p = document.createElement('p');
    p.textContent = `Version ${selectedDocument.version_number}${selectedDocument.page_count > 0 ? ` · ${selectedDocument.page_count} pages` : ''}`;
    info.appendChild(catSpan);
    info.appendChild(h2);
    info.appendChild(p);
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'learn-reader-download';
    downloadBtn.appendChild(icon('download'));
    const span = document.createElement('span');
    span.textContent = 'Download';
    downloadBtn.appendChild(span);
    downloadBtn.onclick = () => {
      api.downloadKnowledgeVersion(selectedDocument.id, previewVersionId).then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedDocument.title;
        link.click();
        URL.revokeObjectURL(url);
      }).catch((err) => { chatError = err instanceof Error ? err.message : 'Please check that the StudentOS service is available.'; renderPage(); });
    };
    heading.appendChild(info);
    heading.appendChild(downloadBtn);
    readerPanel.appendChild(heading);

    if (selectedDocument.description) {
      const d = document.createElement('p');
      d.className = 'learn-reader-description';
      d.textContent = selectedDocument.description;
      readerPanel.appendChild(d);
    }

    const previewDiv = document.createElement('div');
    previewDiv.className = 'learn-document-preview';
    previewDiv.setAttribute('aria-live', 'polite');

    const previewDocumentId = selectedDocument.id;
    const previewVersion = previewVersionId || selectedDocument.version_id;

    if (!preview || preview.documentId !== previewDocumentId || preview.versionId !== previewVersion) {
      const p = document.createElement('p');
      p.className = 'learn-library-empty';
      p.textContent = 'Loading authorized document preview…';
      previewDiv.appendChild(p);
    } else if (preview.error) {
      const empty = document.createElement('div');
      empty.className = 'learn-reader-empty';
      empty.setAttribute('role', 'alert');
      empty.appendChild(icon('fileText'));
      const h3 = document.createElement('h3');
      h3.textContent = 'Preview unavailable';
      const p = document.createElement('p');
      p.textContent = preview.error;
      empty.appendChild(h3);
      empty.appendChild(p);
      previewDiv.appendChild(empty);
    } else if (preview.contentType === 'application/pdf' && preview.url) {
      const iframe = document.createElement('iframe');
      iframe.title = `Preview of ${selectedDocument.title}`;
      iframe.src = `${preview.url}#page=${previewPage}`;
      previewDiv.appendChild(iframe);
    } else if (preview.contentType?.startsWith('image/') && preview.url) {
      const img = document.createElement('img');
      img.src = preview.url;
      img.alt = `Preview of ${selectedDocument.title}`;
      previewDiv.appendChild(img);
    } else {
      const empty = document.createElement('div');
      empty.className = 'learn-reader-empty';
      empty.appendChild(icon('fileText'));
      const h3 = document.createElement('h3');
      h3.textContent = 'Document selected';
      const p = document.createElement('p');
      p.textContent = 'This file type is not previewable here. Use Download to view the original file.';
      empty.appendChild(h3);
      empty.appendChild(p);
      previewDiv.appendChild(empty);
    }

    // Load preview if not loaded
    if (previewDocumentId && previewVersion && (!preview || preview.documentId !== previewDocumentId || preview.versionId !== previewVersion)) {
      const requestId = ++previewRequestId;
      api.downloadKnowledgeVersion(previewDocumentId, previewVersion)
        .then((blob) => {
          if (requestId !== previewRequestId ||
              selectedDocumentId !== previewDocumentId ||
              selectedVersionId !== previewVersion) {
            return;
          }
          replacePreview({
            documentId: previewDocumentId,
            versionId: previewVersion,
            url: URL.createObjectURL(blob),
            contentType: blob.type,
            page: previewPage,
          });
          renderPage();
        })
        .catch((err) => {
          if (requestId !== previewRequestId ||
              selectedDocumentId !== previewDocumentId ||
              selectedVersionId !== previewVersion) {
            return;
          }
          replacePreview({ documentId: previewDocumentId, versionId: previewVersion, error: err instanceof Error ? err.message : 'Please check that the StudentOS service is available.' });
          renderPage();
        });
    }

    readerPanel.appendChild(previewDiv);
  }
  layout.appendChild(readerPanel);

  // Chat panel
  const chatPanel = document.createElement('section');
  chatPanel.id = 'learn-panel-chat';
  chatPanel.setAttribute('role', 'tabpanel');
  chatPanel.setAttribute('aria-labelledby', 'learn-tab-chat');
  chatPanel.className = 'learn-chat-panel';
  chatPanel.setAttribute('aria-label', 'Workspace knowledge assistant');

  const chatHeading = document.createElement('div');
  chatHeading.className = 'learn-panel-heading';
  const chatIcon = document.createElement('div');
  chatIcon.className = 'learn-panel-icon';
  chatIcon.appendChild(icon('bookOpen'));
  const chatInfo = document.createElement('div');
  const chatH2 = document.createElement('h2');
  chatH2.textContent = 'Ask the library';
  const chatP = document.createElement('p');
  chatP.textContent = 'Questions about your documents use published sources; task, deadline and goal questions use your StudentOS data.';
  chatInfo.appendChild(chatH2);
  chatInfo.appendChild(chatP);
  chatHeading.appendChild(chatIcon);
  chatHeading.appendChild(chatInfo);
  chatPanel.appendChild(chatHeading);

  const conversation = document.createElement('div');
  conversation.className = 'learn-conversation';
  conversation.setAttribute('aria-live', 'polite');

  if (turns.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'learn-empty-chat';
    empty.appendChild(icon('search'));
    const strong = document.createElement('strong');
    strong.textContent = 'Find a clear answer, with evidence.';
    const span = document.createElement('span');
    span.textContent = 'Ask about a reference, your tasks, deadlines or goals.';
    empty.appendChild(strong);
    empty.appendChild(span);
    conversation.appendChild(empty);
  } else {
    turns.forEach(({ question: asked, source, knowledge, assistant }) => {
      const article = document.createElement('article');
      article.className = 'learn-turn';
      const q = document.createElement('p');
      q.className = 'learn-question';
      q.textContent = asked;
      article.appendChild(q);
      const label = document.createElement('div');
      label.className = 'learn-turn-label';
      label.textContent = source === 'documents' ? 'From your documents' : 'From your StudentOS data';
      article.appendChild(label);
      const answer = document.createElement('div');
      answer.className = `learn-answer${knowledge?.insufficient_evidence ? ' is-insufficient' : ''}`;
      if (knowledge?.insufficient_evidence) {
        const warn = document.createElement('strong');
        warn.className = 'learn-evidence-warning';
        warn.textContent = 'Not enough evidence — no published source supports this answer.';
        answer.appendChild(warn);
      }
      answer.appendChild(document.createTextNode(source === 'documents' ? (knowledge?.answer || '') : (assistant?.reply || '')));
      article.appendChild(answer);
      if (source === 'documents' && knowledge && knowledge.citations.length > 0) {
        const citations = document.createElement('div');
        citations.className = 'learn-citations';
        const strong = document.createElement('strong');
        strong.appendChild(icon('shieldCheck'));
        strong.appendChild(document.createTextNode(' Sources checked'));
        citations.appendChild(strong);
        knowledge.citations.forEach((citation) => {
          const details = document.createElement('details');
          details.className = 'learn-citation';
          const summary = document.createElement('summary');
          const span = document.createElement('span');
          span.textContent = citation.document_title;
          const small = document.createElement('small');
          small.textContent = `Version ${citation.version_number}${citation.page_start ? ` · page ${citation.page_start}` : ''}`;
          summary.appendChild(span);
          summary.appendChild(small);
          details.appendChild(summary);
          const blockquote = document.createElement('blockquote');
          blockquote.textContent = citation.excerpt;
          details.appendChild(blockquote);
          const openBtn = document.createElement('button');
          openBtn.type = 'button';
          openBtn.className = 'learn-source-link';
          openBtn.setAttribute('aria-label', `Open cited source ${citation.document_title}`);
          openBtn.textContent = 'Open cited document';
          openBtn.onclick = () => {
            selectedDocumentId = citation.document_id;
            selectedVersionId = citation.version_id;
            replacePreview(null);
            activePanel = 'reader';
            previewPage = citation.page_start ?? 1;
            renderPage();
          };
          details.appendChild(openBtn);
          const downloadBtn = document.createElement('button');
          downloadBtn.type = 'button';
          downloadBtn.className = 'learn-source-link';
          downloadBtn.textContent = 'Download cited source';
          downloadBtn.onclick = () => {
            api.downloadKnowledgeVersion(citation.document_id, citation.version_id).then((blob) => {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = citation.document_title;
              link.click();
              URL.revokeObjectURL(url);
            }).catch((err) => { chatError = err instanceof Error ? err.message : 'Please check that the StudentOS service is available.'; renderPage(); });
          };
          details.appendChild(downloadBtn);
          citations.appendChild(details);
        });
        article.appendChild(citations);
      }
      conversation.appendChild(article);
    });
    if (isAsking) {
      const p = document.createElement('p');
      p.className = 'learn-thinking';
      p.textContent = 'Checking your workspace…';
      conversation.appendChild(p);
    }
  }
  chatPanel.appendChild(conversation);

  if (chatError) {
    const err = document.createElement('p');
    err.className = 'learn-error';
    err.setAttribute('role', 'alert');
    err.textContent = chatError;
    chatPanel.appendChild(err);
  }

  const form = document.createElement('form');
  form.className = 'learn-composer';
  form.onsubmit = async (e) => {
    e.preventDefault();
    const prompt = question.trim();
    if (!prompt || isAsking) return;
    isAsking = true;
    chatError = '';
    question = '';
    renderPage();
    const requestId = ++chatRequestId;
    const taskPhrase = isStudentOsTaskQuestion(prompt);
    const hasPublishedDocs = library.length > 0;
    try {
      if (!hasPublishedDocs) {
        if (taskPhrase) {
          const assistant = await api.chatAssistant(prompt);
          turns.push({ question: prompt, source: 'studentos', assistant: { reply: assistant.reply, provider: assistant.provider } });
        } else {
          chatError = 'Documents are unavailable right now — try again later.';
        }
        renderPage();
        return;
      }
      const result = await api.chatWithKnowledge(prompt);
      const hasDocumentEvidence = result && !result.insufficient_evidence && result.answer && result.answer.trim().length > 0;
      if (taskPhrase && !hasDocumentEvidence) {
        const assistant = await api.chatAssistant(prompt);
        turns.push({ question: prompt, source: 'studentos', assistant: { reply: assistant.reply, provider: assistant.provider } });
      } else {
        turns.push({ question: prompt, source: 'documents', knowledge: result });
      }
    } catch {
      if (taskPhrase) {
        try {
          const assistant = await api.chatAssistant(prompt);
          turns.push({ question: prompt, source: 'studentos', assistant: { reply: assistant.reply, provider: assistant.provider } });
        } catch (assistantError) {
          chatError = assistantError instanceof Error ? assistantError.message : 'Please check that the StudentOS service is available.';
        }
      } else {
        chatError = 'Documents are unavailable right now — try again later.';
      }
    } finally {
      if (requestId === chatRequestId) {
        isAsking = false;
        renderPage();
      }
    }
  };

  const textarea = document.createElement('textarea');
  textarea.setAttribute('aria-label', 'Ask about shared workspace documents');
  textarea.placeholder = 'Ask about a shared reference…';
  textarea.rows = 2;
  textarea.maxLength = 2000;
  textarea.value = question;
  textarea.disabled = isAsking;
  textarea.oninput = (e) => { question = e.target.value; };

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.disabled = isAsking || question.trim().length < 2;
  submitBtn.setAttribute('aria-label', 'Ask question');
  submitBtn.appendChild(icon('arrowUp'));

  form.appendChild(textarea);
  form.appendChild(submitBtn);
  chatPanel.appendChild(form);

  const note = document.createElement('p');
  note.className = 'learn-privacy-note';
  note.appendChild(icon('shieldCheck'));
  let noteText;
  if (aiProvider === 'offline') noteText = 'Questions and source matching run locally against published workspace material.';
  else if (aiProvider === 'groq') noteText = 'Your question and relevant source excerpts are sent to the configured Groq AI service — content leaves the server.';
  else noteText = 'Your question and relevant source excerpts are processed by the configured AI service.';
  note.appendChild(document.createTextNode(noteText));
  chatPanel.appendChild(note);

  layout.appendChild(chatPanel);
  container.appendChild(layout);

  if (!libraryLoadStarted) {
    libraryLoadStarted = true;
    Promise.all([api.listKnowledgeLibrary(), api.getKnowledgeAccess(), api.getAiProvider()])
      .then(([items, currentAccess, provider]) => {
        library = items;
        selectedDocumentId = items[0]?.id ?? '';
        selectedVersionId = items[0]?.version_id ?? '';
        access = currentAccess;
        aiProvider = provider.provider;
        isLoadingLibrary = false;
        renderPage();
      })
      .catch((loadError) => {
        error = loadError instanceof Error ? loadError.message : 'Please check that the StudentOS service is available.';
        isLoadingLibrary = false;
        renderPage();
      });
  }

  return container;
  }

  renderPage();
  return container;
}
