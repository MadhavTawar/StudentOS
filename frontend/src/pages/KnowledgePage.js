import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';

export function render() {
  const container = document.createElement('section');
  container.className = 'knowledge-page';

  let library = [];
  let selectedDocumentId = library[0]?.id ?? '';
  let selectedVersionId = library[0]?.version_id ?? '';
  let preview = null;
  let previewPage = 1;
  let activePanel = 'documents';
  let rightTab = 'ask';
  let access = null;
  let aiProvider = null;
  let turns = [];
  let question = '';
  let isLoadingLibrary = true;
  let isAsking = false;
  let error = '';
  let chatError = '';

  const header = document.createElement('header');
  header.className = 'knowledge-heading';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'knowledge-eyebrow';
  eyebrow.textContent = 'SHARED WORKSPACE LIBRARY';
  const h1 = document.createElement('h1');
  h1.textContent = 'Knowledge library';
  const p = document.createElement('p');
  p.textContent = 'Ask questions about published workspace resources and check every answer against its sources.';
  header.appendChild(eyebrow);
  header.appendChild(h1);
  header.appendChild(p);
  if (access?.can_manage_documents) {
    const link = document.createElement('a');
    link.className = 'btn btn-outline knowledge-manage-link';
    link.href = '/app/knowledge/manage';
    link.textContent = 'Manage library';
    link.onclick = (e) => { e.preventDefault(); router.navigate('/app/knowledge/manage'); };
    header.appendChild(link);
  }
  container.appendChild(header);

  const tabs = document.createElement('div');
  tabs.className = 'knowledge-mobile-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Knowledge workspace panels');
  ['documents', 'preview', 'assistant'].forEach((panel) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `knowledge-tab-${panel}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `knowledge-panel-${panel}`);
    btn.setAttribute('aria-selected', activePanel === panel);
    btn.textContent = panel.charAt(0).toUpperCase() + panel.slice(1);
    btn.onclick = () => { activePanel = panel; render(); };
    tabs.appendChild(btn);
  });
  container.appendChild(tabs);

  const layout = document.createElement('div');
  layout.className = 'knowledge-layout';
  layout.setAttribute('data-active-panel', activePanel);

  // Documents panel
  const docsPanel = document.createElement('aside');
  docsPanel.id = 'knowledge-panel-documents';
  docsPanel.setAttribute('role', 'tabpanel');
  docsPanel.setAttribute('aria-labelledby', 'knowledge-tab-documents');
  docsPanel.className = 'knowledge-documents-panel';
  docsPanel.setAttribute('aria-label', 'Published workspace documents');
  const docsHeading = document.createElement('div');
  docsHeading.className = 'knowledge-panel-heading';
  const docsIcon = document.createElement('div');
  docsIcon.className = 'knowledge-panel-icon';
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
    p.className = 'knowledge-library-empty';
    p.textContent = 'Loading the published library…';
    docsPanel.appendChild(p);
  } else if (library.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'knowledge-library-empty';
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
      group.className = 'knowledge-category-group';
      const h3 = document.createElement('h3');
      h3.className = 'knowledge-category-title';
      h3.textContent = `${category} (${items.length})`;
      group.appendChild(h3);
      const ul = document.createElement('ul');
      ul.className = 'knowledge-document-list';
      items.forEach((document) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `knowledge-document-select${selectedDocumentId === document.id ? ' is-selected' : ''}`;
        btn.setAttribute('aria-pressed', selectedDocumentId === document.id);
        btn.onclick = () => {
          selectedDocumentId = document.id;
          selectedVersionId = document.version_id;
          preview = null;
          activePanel = 'preview';
          previewPage = 1;
          render();
        };
        const catSpan = document.createElement('span');
        catSpan.className = 'knowledge-document-category';
        catSpan.textContent = document.category;
        const strong = document.createElement('strong');
        strong.textContent = document.title;
        btn.appendChild(catSpan);
        btn.appendChild(strong);
        if (document.description) {
          const desc = document.createElement('span');
          desc.className = 'knowledge-document-description';
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
    footnote.className = 'knowledge-library-footnote';
    footnote.textContent = 'Only current, published documents are searchable. Archived or superseded versions are excluded.';
    docsPanel.appendChild(footnote);
  }
  layout.appendChild(docsPanel);

  const selectedDocument = library.find((item) => item.id === selectedDocumentId) || library[0] || null;
  const previewVersionId = selectedVersionId || selectedDocument?.version_id || '';

  // Preview panel
  const previewPanel = document.createElement('section');
  previewPanel.id = 'knowledge-panel-preview';
  previewPanel.setAttribute('role', 'tabpanel');
  previewPanel.setAttribute('aria-labelledby', 'knowledge-tab-preview');
  previewPanel.className = 'knowledge-reader-panel';
  previewPanel.setAttribute('aria-label', 'Selected document');

  if (!selectedDocument) {
    const empty = document.createElement('div');
    empty.className = 'knowledge-reader-empty';
    empty.appendChild(icon('bookOpen'));
    const h2 = document.createElement('h2');
    h2.textContent = 'Select a published document';
    const p = document.createElement('p');
    p.textContent = 'Choose a document from the workspace library to inspect its details.';
    empty.appendChild(h2);
    empty.appendChild(p);
    previewPanel.appendChild(empty);
  } else {
    const heading = document.createElement('div');
    heading.className = 'knowledge-reader-heading';
    const info = document.createElement('div');
    const catSpan = document.createElement('span');
    catSpan.className = 'knowledge-document-category';
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
    downloadBtn.className = 'knowledge-reader-download';
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
      }).catch((err) => { chatError = err instanceof Error ? err.message : 'Please check that the StudentOS service is available.'; render(); });
    };
    heading.appendChild(info);
    heading.appendChild(downloadBtn);
    previewPanel.appendChild(heading);

    if (selectedDocument.description) {
      const d = document.createElement('p');
      d.className = 'knowledge-reader-description';
      d.textContent = selectedDocument.description;
      previewPanel.appendChild(d);
    }

    const previewDiv = document.createElement('div');
    previewDiv.className = 'knowledge-document-preview';
    previewDiv.setAttribute('aria-live', 'polite');

    const previewDocumentId = selectedDocument.id;
    const previewVersion = previewVersionId || selectedDocument.version_id;

    if (!preview || preview.documentId !== previewDocumentId || preview.versionId !== previewVersion) {
      const p = document.createElement('p');
      p.className = 'knowledge-library-empty';
      p.textContent = 'Loading authorized document preview…';
      previewDiv.appendChild(p);
    } else if (preview.error) {
      const empty = document.createElement('div');
      empty.className = 'knowledge-reader-empty';
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
      empty.className = 'knowledge-reader-empty';
      empty.appendChild(icon('fileText'));
      const h3 = document.createElement('h3');
      h3.textContent = 'Document selected';
      const p = document.createElement('p');
      p.textContent = 'This file type is not previewable here. Use Download to view the original file.';
      empty.appendChild(h3);
      empty.appendChild(p);
      previewDiv.appendChild(empty);
    }

    if (previewDocumentId && previewVersion && (!preview || preview.documentId !== previewDocumentId || preview.versionId !== previewVersion)) {
      api.downloadKnowledgeVersion(previewDocumentId, previewVersion)
        .then((blob) => {
          preview = {
            documentId: previewDocumentId,
            versionId: previewVersion,
            url: URL.createObjectURL(blob),
            contentType: blob.type,
            page: previewPage,
          };
          render();
        })
        .catch((err) => {
          preview = { documentId: previewDocumentId, versionId: previewVersion, error: err instanceof Error ? err.message : 'Please check that the StudentOS service is available.' };
          render();
        });
    }

    previewPanel.appendChild(previewDiv);
  }
  layout.appendChild(previewPanel);

  // Assistant panel
  const assistantPanel = document.createElement('section');
  assistantPanel.id = 'knowledge-panel-assistant';
  assistantPanel.setAttribute('role', 'tabpanel');
  assistantPanel.setAttribute('aria-labelledby', 'knowledge-tab-assistant');
  assistantPanel.className = 'knowledge-chat-panel';
  assistantPanel.setAttribute('aria-label', 'Workspace knowledge assistant');

  const assistantHeading = document.createElement('div');
  assistantHeading.className = 'knowledge-panel-heading';
  const assistantIcon = document.createElement('div');
  assistantIcon.className = 'knowledge-panel-icon';
  assistantIcon.appendChild(icon('bookOpen'));
  const assistantInfo = document.createElement('div');
  const assistantH2 = document.createElement('h2');
  assistantH2.textContent = 'Ask the library';
  const assistantP = document.createElement('p');
  assistantP.textContent = 'Answers are grounded in the current published collection.';
  assistantInfo.appendChild(assistantH2);
  assistantInfo.appendChild(assistantP);
  assistantHeading.appendChild(assistantIcon);
  assistantHeading.appendChild(assistantInfo);
  assistantPanel.appendChild(assistantHeading);

  const rightTabs = document.createElement('div');
  rightTabs.className = 'knowledge-right-tabs';
  const askBtn = document.createElement('button');
  askBtn.type = 'button';
  askBtn.className = `knowledge-right-tab${rightTab === 'ask' ? ' is-active' : ''}`;
  askBtn.textContent = 'Ask';
  askBtn.onclick = () => { rightTab = 'ask'; render(); };
  const detailsBtn = document.createElement('button');
  detailsBtn.type = 'button';
  detailsBtn.className = `knowledge-right-tab${rightTab === 'details' ? ' is-active' : ''}`;
  detailsBtn.textContent = 'Details';
  detailsBtn.onclick = () => { rightTab = 'details'; render(); };
  rightTabs.appendChild(askBtn);
  rightTabs.appendChild(detailsBtn);
  assistantPanel.appendChild(rightTabs);

  if (rightTab === 'ask') {
    const conversation = document.createElement('div');
    conversation.className = 'knowledge-conversation';
    conversation.setAttribute('aria-live', 'polite');

    if (turns.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'knowledge-empty-chat';
      empty.appendChild(icon('search'));
      const strong = document.createElement('strong');
      strong.textContent = 'Find a clear answer, with evidence.';
      const span = document.createElement('span');
      span.textContent = 'Try asking about a reference, study resource, or shared procedure.';
      empty.appendChild(strong);
      empty.appendChild(span);
      conversation.appendChild(empty);
    } else {
      turns.forEach(({ question: asked, result }) => {
        const article = document.createElement('article');
        article.className = 'knowledge-turn';
        const q = document.createElement('p');
        q.className = 'knowledge-question';
        q.textContent = asked;
        article.appendChild(q);
        const answer = document.createElement('div');
        answer.className = `knowledge-answer${result.insufficient_evidence ? ' is-insufficient' : ''}`;
        if (result.insufficient_evidence) {
          const warn = document.createElement('strong');
          warn.className = 'knowledge-evidence-warning';
          warn.textContent = 'Not enough evidence — no published source supports this answer.';
          answer.appendChild(warn);
        }
        answer.appendChild(document.createTextNode(result.answer || ''));
        article.appendChild(answer);
        if (result.citations.length > 0) {
          const citations = document.createElement('div');
          citations.className = 'knowledge-citations';
          const strong = document.createElement('strong');
          strong.appendChild(icon('shieldCheck'));
          strong.appendChild(document.createTextNode(' Sources checked'));
          citations.appendChild(strong);
          result.citations.forEach((citation) => {
            const details = document.createElement('details');
            details.className = 'knowledge-citation';
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
            openBtn.className = 'knowledge-source-link';
            openBtn.setAttribute('aria-label', `Open cited source ${citation.document_title}`);
            openBtn.textContent = 'Open cited document';
            openBtn.onclick = () => {
              selectedDocumentId = citation.document_id;
              selectedVersionId = citation.version_id;
              preview = null;
              activePanel = 'preview';
              previewPage = citation.page_start ?? 1;
              rightTab = 'ask';
              render();
            };
            details.appendChild(openBtn);
            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'knowledge-source-link';
            downloadBtn.textContent = 'Download cited source';
            downloadBtn.onclick = () => {
              api.downloadKnowledgeVersion(citation.document_id, citation.version_id).then((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = citation.document_title;
                link.click();
                URL.revokeObjectURL(url);
              }).catch((err) => { chatError = err instanceof Error ? err.message : 'Please check that the StudentOS service is available.'; render(); });
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
        p.className = 'knowledge-thinking';
        p.textContent = 'Checking published workspace sources…';
        conversation.appendChild(p);
      }
    }
    assistantPanel.appendChild(conversation);

    if (chatError) {
      const err = document.createElement('p');
      err.className = 'knowledge-error';
      err.setAttribute('role', 'alert');
      err.textContent = chatError;
      assistantPanel.appendChild(err);
    }

    const form = document.createElement('form');
    form.className = 'knowledge-composer';
    form.onsubmit = async (e) => {
      e.preventDefault();
      const prompt = question.trim();
      if (!prompt || isAsking) return;
      isAsking = true;
      chatError = '';
      question = '';
      render();
      try {
        const result = await api.chatWithKnowledge(prompt);
        turns.push({ question: prompt, result });
      } catch (requestError) {
        chatError = requestError instanceof Error ? requestError.message : 'Please check that the StudentOS service is available.';
        question = prompt;
      } finally {
        isAsking = false;
        render();
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
    assistantPanel.appendChild(form);

    const note = document.createElement('p');
    note.className = 'knowledge-privacy-note';
    note.appendChild(icon('shieldCheck'));
    let noteText;
    if (aiProvider === 'offline') noteText = 'Questions and source matching run locally against published workspace material.';
    else if (aiProvider === 'groq') noteText = 'Your question and relevant source excerpts are sent to the configured Groq AI service.';
    else noteText = 'Your question and relevant source excerpts are processed by the configured AI service.';
    note.appendChild(document.createTextNode(noteText));
    assistantPanel.appendChild(note);
  }

  if (rightTab === 'details' && selectedDocument) {
    const details = document.createElement('div');
    details.className = 'knowledge-details';
    const h3 = document.createElement('h3');
    h3.textContent = 'Document details';
    details.appendChild(h3);
    const dl = document.createElement('dl');
    dl.className = 'knowledge-details-list';
    const fields = [
      ['Title', selectedDocument.title],
      ['Category', selectedDocument.category],
      ['Version', selectedDocument.version_number],
      ['Pages', selectedDocument.page_count > 0 ? selectedDocument.page_count : 'Not specified'],
      ['Published', new Date(selectedDocument.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })],
    ];
    fields.forEach(([dt, dd]) => {
      const dTerm = document.createElement('dt');
      dTerm.textContent = dt;
      const dDef = document.createElement('dd');
      dDef.textContent = dd;
      dl.appendChild(dTerm);
      dl.appendChild(dDef);
    });
    if (selectedDocument.description) {
      const dTerm = document.createElement('dt');
      dTerm.textContent = 'Description';
      const dDef = document.createElement('dd');
      dDef.textContent = selectedDocument.description;
      dl.appendChild(dTerm);
      dl.appendChild(dDef);
    }
    details.appendChild(dl);
    assistantPanel.appendChild(details);
  }

  layout.appendChild(assistantPanel);
  container.appendChild(layout);

  // Load data
  Promise.all([api.listKnowledgeLibrary(), api.getKnowledgeAccess(), api.getAiProvider()])
    .then(([items, currentAccess, provider]) => {
      library = items;
      selectedDocumentId = items[0]?.id ?? '';
      selectedVersionId = items[0]?.version_id ?? '';
      access = currentAccess;
      aiProvider = provider.provider;
      isLoadingLibrary = false;
      render();
    })
    .catch((loadError) => {
      error = loadError instanceof Error ? loadError.message : 'Please check that the StudentOS service is available.';
      isLoadingLibrary = false;
      render();
    });

  return container;
}
