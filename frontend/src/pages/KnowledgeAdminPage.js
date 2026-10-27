import { api } from '../api.js';
import { icon } from '../icons.js';

const errorText = (error) => error instanceof Error ? error.message : 'Please check that the StudentOS service is available.';

export function render() {
  const container = document.createElement('section');
  container.className = 'knowledge-admin-page';

  let access = null;
  let documents = [];
  let isBusy = false;
  let error = '';
  let notice = '';
  let uploadError = '';
  let title = '';
  let description = '';
  let category = 'General';
  let file = null;

  async function refresh() {
    const currentAccess = await api.getKnowledgeAccess();
    access = currentAccess;
    if (!currentAccess.can_manage_documents) return;
    const currentDocuments = await api.listKnowledgeDocuments();
    documents = currentDocuments;
  }

  async function load() {
    try {
      await refresh();
    } catch (loadError) {
      error = errorText(loadError);
    } finally {
      isLoading = false;
      render();
    }
  }

  async function runAction(action, successMessage) {
    isBusy = true;
    error = '';
    notice = '';
    uploadError = '';
    render();
    try {
      await action();
      await refresh();
      notice = successMessage;
    } catch (actionError) {
      const message = errorText(actionError);
      error = message;
      if (/embedding model|embedding|vector|index/i.test(message)) {
        uploadError = `Document saved, but processing failed: ${message}. Try again once the embedding model is available.`;
      }
    } finally {
      isBusy = false;
      render();
    }
  }

  async function doUpload() {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('description', description);
    form.append('category', category);
    await api.uploadKnowledgeDocument(form);
    title = ''; description = ''; category = 'General'; file = null;
    const input = document.getElementById('knowledge-upload-file');
    if (input) input.value = '';
  }

  async function submitUpload(e) {
    e.preventDefault();
    if (!file) {
      error = 'Choose a PDF or DOCX file to upload.';
      render();
      return;
    }
    await runAction(doUpload, 'Document processed. Review its version below and publish it when ready.');
  }

  async function uploadReplacement(documentId, replacement) {
    await runAction(
      async () => { await api.uploadKnowledgeVersion(documentId, replacement); },
      'Replacement version processed. The current published version remains active until you publish this one.',
    );
  }

  async function downloadVersion(documentId, versionId, filename) {
    try {
      const blob = await api.downloadKnowledgeVersion(documentId, versionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      error = errorText(downloadError);
      render();
    }
  }

  const header = document.createElement('header');
  header.className = 'knowledge-admin-heading';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'SHARED WORKSPACE';
  const h1 = document.createElement('h1');
  h1.textContent = 'Library manager';
  const p = document.createElement('p');
  p.textContent = 'Upload, review, publish, and archive references for this workspace.';
  header.appendChild(eyebrow);
  header.appendChild(h1);
  header.appendChild(p);
  container.appendChild(header);

  if (!access?.can_manage_documents) {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'knowledge-admin-notice';
    noticeDiv.setAttribute('role', 'status');
    noticeDiv.textContent = error || 'Switch to a workspace you own or administer, or create one from the workspace settings.';
    const link = document.createElement('a');
    link.href = '/app/workspaces';
    link.textContent = ' Manage workspaces';
    link.onclick = (e) => { e.preventDefault(); router.navigate('/app/workspaces'); };
    noticeDiv.appendChild(link);
    container.appendChild(noticeDiv);
    if (error) {
      const errDiv = document.createElement('div');
      errDiv.className = 'knowledge-admin-notice is-error';
      errDiv.setAttribute('role', 'alert');
      errDiv.textContent = error;
      container.appendChild(errDiv);
    }
    load();
    return container;
  }

  load();

  if (error) {
    const errDiv = document.createElement('div');
    errDiv.className = 'knowledge-admin-notice is-error';
    errDiv.setAttribute('role', 'alert');
    errDiv.textContent = error;
    container.appendChild(errDiv);
  }
  if (notice) {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'knowledge-admin-notice';
    noticeDiv.setAttribute('role', 'status');
    noticeDiv.textContent = notice;
    container.appendChild(noticeDiv);
  }
  if (uploadError) {
    const errDiv = document.createElement('div');
    errDiv.className = 'knowledge-admin-notice is-error';
    errDiv.setAttribute('role', 'alert');
    errDiv.textContent = uploadError;
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'knowledge-admin-retry';
    retryBtn.textContent = 'Retry upload';
    retryBtn.onclick = () => {
      uploadError = '';
      runAction(doUpload, 'Document processed. Review its version below and publish it when ready.');
    };
    errDiv.appendChild(retryBtn);
    container.appendChild(errDiv);
  }

  const grid = document.createElement('div');
  grid.className = 'knowledge-admin-grid';

  // Upload form
  const form = document.createElement('form');
  form.className = 'knowledge-admin-panel knowledge-upload-form';
  form.onsubmit = submitUpload;

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'knowledge-admin-section-title';
  sectionTitle.appendChild(icon('filePlus2'));
  const div = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = 'Add a document';
  const p2 = document.createElement('p');
  p2.textContent = 'Only PDF and DOCX files are accepted.';
  div.appendChild(h2);
  div.appendChild(p2);
  sectionTitle.appendChild(div);
  form.appendChild(sectionTitle);

  const field1 = document.createElement('label');
  field1.textContent = 'Document title ';
  const input1 = document.createElement('input');
  input1.value = title;
  input1.maxLength = 240;
  input1.required = true;
  input1.oninput = (e) => { title = e.target.value; };
  field1.appendChild(input1);
  form.appendChild(field1);

  const field2 = document.createElement('label');
  field2.textContent = 'Category ';
  const input2 = document.createElement('input');
  input2.value = category;
  input2.maxLength = 100;
  input2.oninput = (e) => { category = e.target.value; };
  field2.appendChild(input2);
  form.appendChild(field2);

  const field3 = document.createElement('label');
  field3.textContent = 'Description ';
  const ta = document.createElement('textarea');
  ta.value = description;
  ta.maxLength = 10000;
  ta.rows = 3;
  ta.oninput = (e) => { description = e.target.value; };
  field3.appendChild(ta);
  form.appendChild(field3);

  const field4 = document.createElement('label');
  field4.textContent = 'PDF or DOCX file ';
  const fileInput = document.createElement('input');
  fileInput.id = 'knowledge-upload-file';
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileInput.required = true;
  fileInput.onchange = (e) => { file = e.target.files?.[0] || null; };
  field4.appendChild(fileInput);
  form.appendChild(field4);

  const helper = document.createElement('p');
  helper.className = 'knowledge-admin-helper';
  helper.textContent = 'Files are stored privately. New uploads stay unpublished until you review and publish a processed version.';
  form.appendChild(helper);

  const submitBtn = document.createElement('button');
  submitBtn.className = 'knowledge-admin-primary';
  submitBtn.type = 'submit';
  submitBtn.disabled = isBusy;
  submitBtn.textContent = isBusy ? 'Processing…' : 'Upload and process';
  form.appendChild(submitBtn);

  grid.appendChild(form);

  // Document lifecycle
  const lifecycle = document.createElement('section');
  lifecycle.className = 'knowledge-admin-panel';
  const lifecycleTitle = document.createElement('div');
  lifecycleTitle.className = 'knowledge-admin-section-title';
  lifecycleTitle.appendChild(icon('library'));
  const div2 = document.createElement('div');
  const h3 = document.createElement('h2');
  h3.textContent = 'Document lifecycle';
  const p3 = document.createElement('p');
  p3.textContent = 'Published versions are searchable by students.';
  div2.appendChild(h3);
  div2.appendChild(p3);
  lifecycleTitle.appendChild(div2);
  lifecycle.appendChild(lifecycleTitle);

  if (documents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'knowledge-admin-empty';
    empty.textContent = 'No shared references have been uploaded yet.';
    lifecycle.appendChild(empty);
  } else {
    const docsList = document.createElement('div');
    docsList.className = 'knowledge-admin-documents';
    documents.forEach((document) => {
      const article = document.createElement('article');
      article.className = 'knowledge-admin-document';
      const heading = document.createElement('div');
      heading.className = 'knowledge-admin-document-heading';
      const info = document.createElement('div');
      const status = document.createElement('span');
      status.className = `knowledge-admin-status is-${document.status}`;
      status.textContent = document.status;
      const h3 = document.createElement('h3');
      h3.textContent = document.title;
      info.appendChild(status);
      info.appendChild(h3);
      const small = document.createElement('small');
      small.textContent = document.category;
      heading.appendChild(info);
      heading.appendChild(small);
      article.appendChild(heading);

      if (document.description) {
        const desc = document.createElement('p');
        desc.className = 'knowledge-admin-description';
        desc.textContent = document.description;
        article.appendChild(desc);
      }

      const versions = document.createElement('ul');
      versions.className = 'knowledge-admin-versions';
      document.versions.forEach((version) => {
        const li = document.createElement('li');
        const infoDiv = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `Version ${version.version_number}`;
        const span = document.createElement('span');
        span.textContent = version.original_filename;
        const small = document.createElement('small');
        small.textContent = `${version.status}${version.page_count > 0 ? ` · ${version.page_count} pages` : ''}`;
        if (version.error_message) {
          const errSmall = document.createElement('small');
          errSmall.className = 'knowledge-admin-error-text';
          errSmall.textContent = version.error_message;
          infoDiv.appendChild(strong);
          infoDiv.appendChild(span);
          infoDiv.appendChild(small);
          infoDiv.appendChild(errSmall);
        } else {
          infoDiv.appendChild(strong);
          infoDiv.appendChild(span);
          infoDiv.appendChild(small);
        }
        const actions = document.createElement('div');
        actions.className = 'knowledge-admin-version-actions';
        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.setAttribute('title', 'Download source file');
        downloadBtn.setAttribute('aria-label', `Download ${version.original_filename}`);
        downloadBtn.appendChild(icon('download'));
        downloadBtn.onclick = () => downloadVersion(document.id, version.id, version.original_filename);
        actions.appendChild(downloadBtn);
        if (version.status === 'ready' && document.status !== 'archived') {
          const publishBtn = document.createElement('button');
          publishBtn.type = 'button';
          publishBtn.className = 'is-publish';
          publishBtn.disabled = isBusy;
          publishBtn.textContent = 'Publish';
          publishBtn.onclick = () => runAction(
            async () => { await api.publishKnowledgeVersion(document.id, version.id); },
            `Version ${version.version_number} is now published.`,
          );
          actions.appendChild(publishBtn);
        }
        li.appendChild(infoDiv);
        li.appendChild(actions);
        versions.appendChild(li);
      });
      article.appendChild(versions);

      if (document.status !== 'archived') {
        const docActions = document.createElement('div');
        docActions.className = 'knowledge-admin-document-actions';
        const replaceLabel = document.createElement('label');
        replaceLabel.className = 'knowledge-admin-replace';
        replaceLabel.textContent = 'Replace with a new version ';
        const replaceInput = document.createElement('input');
        replaceInput.type = 'file';
        replaceInput.accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        replaceInput.disabled = isBusy;
        replaceInput.onchange = (e) => {
          const replacement = e.target.files?.[0];
          if (replacement) uploadReplacement(document.id, replacement);
          e.target.value = '';
        };
        replaceLabel.appendChild(replaceInput);
        docActions.appendChild(replaceLabel);

        const archiveBtn = document.createElement('button');
        archiveBtn.type = 'button';
        archiveBtn.className = 'knowledge-admin-archive';
        archiveBtn.disabled = isBusy;
        archiveBtn.appendChild(icon('archive'));
        archiveBtn.appendChild(document.createTextNode(' Archive'));
        archiveBtn.onclick = () => {
          if (window.confirm(`Archive "${document.title}" and remove it from student search?`)) {
            runAction(
              async () => { await api.archiveKnowledgeDocument(document.id); },
              'Document archived and removed from student search.',
            );
          }
        };
        docActions.appendChild(archiveBtn);
        article.appendChild(docActions);
      }

      docsList.appendChild(article);
    });
    lifecycle.appendChild(docsList);
  }
  grid.appendChild(lifecycle);
  container.appendChild(grid);

  return container;
}
