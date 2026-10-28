import { api } from '../api.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';
import { Modal } from '../components/index.js';

export function render() {
  const container = document.createElement('div');
  container.className = 'inbox-page productivity-page';

  let status = null;
  let aiProvider = null;
  let messages = [];
  let isLoading = true;
  let search = '';
  let searchRef = '';

  let extractingEmail = null;
  let extractedCandidates = [];
  let isExtracting = false;
  let isModalOpen = false;
  let reviewMessage = null;
  let candidateEdits = {};

  function fetchInbox() {
    isLoading = true;
    renderPage();
    api.getGmailStatus()
      .then((statusData) => {
        status = statusData;
        return api.getAiProvider().then((prov) => { aiProvider = prov.provider; }).catch(() => { aiProvider = null; });
      })
      .then(() => {
        if (status && status.is_connected) {
          return api.listGmailMessages(searchRef.trim() || undefined).then((msgs) => { messages = msgs.messages; });
        }
      })
      .catch((err) => { console.error(err); })
      .finally(() => { isLoading = false; renderPage(); });
  }

  async function handleConnectGmail() {
    try {
      const { auth_url } = await api.getGmailAuthUrl();
      if (auth_url.includes('code=') && auth_url.includes('state=')) {
        const urlObj = new URL(auth_url);
        const code = urlObj.searchParams.get('code') || '';
        const state = urlObj.searchParams.get('state') || '';
        await api.sendGmailCallback(code, state);
        fetchInbox();
      } else {
        window.location.href = auth_url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initiate Gmail authorization.');
    }
  }

  async function handleDisconnectGmail() {
    if (!window.confirm('Disconnect Gmail? Your cached email previews will be cleared. (Tasks and deadlines you confirmed will remain safe).')) return;
    try {
      await api.disconnectGmail();
      fetchInbox();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect Gmail.');
    }
  }

  async function handleExtractAI(email) {
    extractingEmail = email;
    isExtracting = true;
    isModalOpen = true;
    reviewMessage = null;
    renderPage();
    try {
      const candidates = await api.extractEmailCandidates({
        message_id: email.message_id,
        subject: email.subject,
        snippet: email.snippet || '',
        sender: email.sender,
      });
      extractedCandidates = candidates;
      candidateEdits = Object.fromEntries(candidates.map((candidate) => {
        const dueDate = candidate.suggested_due_date ? new Date(candidate.suggested_due_date) : null;
        if (dueDate) dueDate.setMinutes(dueDate.getMinutes() - dueDate.getTimezoneOffset());
        return [candidate.id, { title: candidate.title, dueDate: dueDate?.toISOString().slice(0, 16) || '', isAmbiguous: candidate.is_ambiguous }];
      }));
    } catch (err) {
      reviewMessage = err instanceof Error ? err.message : 'AI extraction failed.';
    } finally {
      isExtracting = false;
      renderPage();
    }
  }

  async function handleReviewAction(candidateId, action) {
    try {
      const edits = candidateEdits[candidateId];
      await api.reviewAICandidate(candidateId, action, {
        title: edits ? edits.title.trim() : undefined,
        suggested_due_date: edits?.dueDate ? new Date(edits.dueDate).toISOString() : undefined,
        is_ambiguous: edits?.isAmbiguous,
      });
      extractedCandidates = extractedCandidates.map((c) => (c.id === candidateId ? { ...c, validation_status: action === 'approve' ? 'approved' : 'rejected' } : c));
      reviewMessage = action === 'approve' ? 'Approved! The proposal has been converted into an active task/deadline.' : 'Proposal rejected and dismissed.';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    }
    renderPage();
  }

  function renderPage() {
    container.replaceChildren();

  // Header
  const heading = document.createElement('div');
  heading.className = 'page-heading';
  const left = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Academic Inbox';
  const desc = document.createElement('p');
  desc.className = 'page-description';
  desc.textContent = 'Read-only Gmail integration with assignment and examination suggestions. ';
  const providerNote = document.createElement('span');
  if (aiProvider === null) providerNote.textContent = ' Could not confirm which AI provider is used for extraction.';
  else if (aiProvider === 'groq') providerNote.textContent = " The selected email's subject, sender, and snippet are sent to Groq for extraction.";
  else providerNote.textContent = ' Extraction runs locally; no email content leaves your device.';
  desc.appendChild(providerNote);
  left.appendChild(h1);
  left.appendChild(desc);

  const actions = document.createElement('div');
  actions.className = 'inbox-connection-actions';
  if (status && status.is_connected) {
    const badge = document.createElement('span');
    badge.className = 'badge inbox-connected-badge';
    badge.appendChild(icon('shieldCheck'));
    badge.appendChild(document.createTextNode(` Connected: ${status.email_address}`));
    const disconnectBtn = Button({ children: 'Disconnect', variant: 'danger', size: 'sm', onClick: handleDisconnectGmail });
    actions.appendChild(badge);
    actions.appendChild(disconnectBtn);
  } else {
    const connectBtn = Button({ children: 'Connect Gmail (Read-Only)', variant: 'primary', onClick: handleConnectGmail, icon: 'mail' });
    actions.appendChild(connectBtn);
  }
  heading.appendChild(left);
  heading.appendChild(actions);
  container.appendChild(heading);

  // Security notice
  const notice = document.createElement('div');
  notice.className = 'card inbox-security-notice';
  const lock = icon('lock');
  lock.style.width = '20px';
  lock.style.height = '20px';
  const copy = document.createElement('div');
  copy.className = 'inbox-security-copy';
  const title = document.createElement('div');
  title.className = 'inbox-security-title';
  title.textContent = 'Least-Privilege Gmail Security Controls';
  const description = document.createElement('div');
  description.className = 'inbox-security-description';
  description.innerHTML = 'StudentOS requests strictly <strong>read-only access</strong> (<code>gmail.readonly</code>). We never request permission to send, modify, or delete your emails. Extracted action items require your explicit confirmation before saving.';
  copy.appendChild(title);
  copy.appendChild(description);
  notice.appendChild(lock);
  notice.appendChild(copy);
  container.appendChild(notice);

  // Main view
  if (!(status && status.is_connected)) {
    container.appendChild(EmptyState({
      icon: icon('mail'),
      title: 'Connect your Gmail',
      description: 'Link a mailbox with read-only permissions to find messages that may contain tasks and deadlines.',
      action: Button({ children: 'Connect Gmail (Read-Only)', variant: 'primary', onClick: handleConnectGmail, icon: 'mail' }),
    }));
    return container;
  }

  const content = document.createElement('div');
  content.className = 'inbox-content';

  const toolbar = document.createElement('div');
  toolbar.className = 'card inbox-toolbar';
  const searchField = document.createElement('div');
  searchField.className = 'inbox-search-field';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search emails by sender or subject...';
  searchInput.value = search;
  searchInput.className = 'input inbox-search-input';
  searchInput.setAttribute('aria-label', 'Search emails');
  searchInput.oninput = (e) => { searchRef = e.target.value; search = e.target.value; };
  searchInput.onkeydown = (e) => { if (e.key === 'Enter') fetchInbox(); };
  const searchIcon = icon('search');
  searchIcon.className = 'inbox-search-icon';
  searchField.appendChild(searchInput);
  searchField.appendChild(searchIcon);
  const refreshBtn = Button({ children: 'Refresh Inbox', variant: 'outline', size: 'sm', onClick: fetchInbox, icon: 'refreshCw' });
  toolbar.appendChild(searchField);
  toolbar.appendChild(refreshBtn);
  content.appendChild(toolbar);

  if (isLoading) {
    content.appendChild(LoadingSkeleton({ rows: 4, height: '85px' }));
  } else if (messages.length === 0) {
    content.appendChild(EmptyState({
      icon: icon('mail'),
      title: 'No messages found',
      description: 'No relevant messages matched your search.',
    }));
  } else {
    const list = document.createElement('div');
    list.className = 'inbox-message-list';
    messages.forEach((msg) => {
      const row = document.createElement('div');
      row.className = 'card card-hover inbox-message-row';
      const contentDiv = document.createElement('div');
      contentDiv.className = 'inbox-message-content';
      const meta = document.createElement('div');
      meta.className = 'inbox-message-meta';
      const sender = document.createElement('span');
      sender.className = 'inbox-sender';
      sender.textContent = msg.sender;
      const time = document.createElement('span');
      time.className = 'inbox-message-time';
      time.textContent = new Date(msg.internal_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      meta.appendChild(sender);
      meta.appendChild(time);
      const subject = document.createElement('div');
      subject.className = 'inbox-message-subject';
      subject.textContent = msg.subject;
      const snippet = document.createElement('div');
      snippet.className = 'inbox-message-snippet';
      snippet.textContent = msg.snippet;
      contentDiv.appendChild(meta);
      contentDiv.appendChild(subject);
      contentDiv.appendChild(snippet);
      const extractBtn = Button({ children: 'Extract Proposals', variant: 'primary', size: 'sm', onClick: () => handleExtractAI(msg), icon: 'sparkles' });
      row.appendChild(contentDiv);
      row.appendChild(extractBtn);
      list.appendChild(row);
    });
    content.appendChild(list);
  }
  container.appendChild(content);

  // AI Extraction Modal
  if (isModalOpen) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { isModalOpen = false; renderPage(); },
      title: 'AI Candidate Review & Verification',
      description: 'Verify extracted tasks and deadlines before adding to your schedule.',
      maxWidth: 'max-w-2xl',
    });
    const review = document.createElement('div');
    review.className = 'proposal-review';

    if (extractingEmail) {
      const source = document.createElement('div');
      source.className = 'proposal-source';
      const label = document.createElement('div');
      label.className = 'proposal-source-label';
      label.textContent = 'SOURCE EMAIL';
      const subject = document.createElement('div');
      subject.className = 'proposal-source-subject';
      subject.textContent = extractingEmail.subject;
      const sender = document.createElement('div');
      sender.className = 'proposal-source-sender';
      sender.textContent = `From: ${extractingEmail.sender}`;
      source.appendChild(label);
      source.appendChild(subject);
      source.appendChild(sender);
      review.appendChild(source);
    }

    if (reviewMessage) {
      const msg = document.createElement('div');
      msg.className = 'proposal-review-message';
      msg.textContent = reviewMessage;
      review.appendChild(msg);
    }

    if (isExtracting) {
      const loading = document.createElement('div');
      loading.className = 'proposal-loading';
      loading.appendChild(LoadingSkeleton({ rows: 3, height: '45px' }));
      const p = document.createElement('p');
      p.className = 'proposal-loading-text';
      p.textContent = 'Analyzing email with prompt-injection defense and extracting structured proposals...';
      loading.appendChild(p);
      review.appendChild(loading);
    } else if (extractedCandidates.length === 0) {
      review.appendChild(EmptyState({
        icon: icon('helpCircle'),
        title: 'No action items found',
        description: 'No explicit assignments, deadlines, or examinations were identified in this email.',
      }));
    } else {
      const list = document.createElement('div');
      list.className = 'proposal-list';
      list.setAttribute('aria-label', 'Email extraction proposals');
      extractedCandidates.forEach((candidate) => {
        const isApproved = candidate.validation_status === 'approved';
        const isRejected = candidate.validation_status === 'rejected';
        const card = document.createElement('div');
        card.className = `proposal-card ${isApproved ? 'is-approved' : isRejected ? 'is-rejected' : 'is-pending'}`;
        const layout = document.createElement('div');
        layout.className = 'proposal-card-layout';
        const content = document.createElement('div');
        content.className = 'proposal-card-content';
        const meta = document.createElement('div');
        meta.className = 'proposal-card-meta';
        const typeBadge = document.createElement('span');
        typeBadge.className = `badge ${candidate.candidate_type === 'task' ? 'proposal-type-task' : 'proposal-type-deadline'}`;
        typeBadge.textContent = `PROPOSED ${candidate.candidate_type.toUpperCase()}`;
        const confidence = document.createElement('span');
        confidence.className = 'proposal-confidence';
        confidence.textContent = `Confidence: ${Math.round(candidate.confidence_score * 100)}%`;
        meta.appendChild(typeBadge);
        meta.appendChild(confidence);
        const cTitle = document.createElement('div');
        cTitle.className = 'proposal-title';
        cTitle.textContent = candidate.title;
        if (candidate.suggested_due_date) {
          const dueDate = document.createElement('div');
          dueDate.className = 'proposal-due-date';
          dueDate.appendChild(icon('clock'));
          dueDate.appendChild(document.createTextNode(` Suggested Due Date: ${new Date(candidate.suggested_due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`));
          content.appendChild(dueDate);
        }
        if (candidate.validation_status === 'pending_review') {
          const fields = document.createElement('div');
          fields.className = 'proposal-edit-fields';
          const titleField = document.createElement('label');
          titleField.className = 'proposal-edit-field';
          const titleLabel = document.createElement('span');
          titleLabel.textContent = 'Title';
          const titleInput = document.createElement('input');
          titleInput.className = 'input';
          titleInput.setAttribute('aria-label', `Edit title for ${candidate.title}`);
          titleInput.value = (candidateEdits[candidate.id] || {}).title ?? candidate.title;
          titleInput.oninput = (e) => {
            candidateEdits[candidate.id] = { ...(candidateEdits[candidate.id] || {}), title: e.target.value, dueDate: (candidateEdits[candidate.id] || {}).dueDate ?? '', isAmbiguous: (candidateEdits[candidate.id] || {}).isAmbiguous ?? candidate.is_ambiguous };
          };
          titleField.appendChild(titleLabel);
          titleField.appendChild(titleInput);
          fields.appendChild(titleField);

          const dueField = document.createElement('label');
          dueField.className = 'proposal-edit-field';
          const dueLabel = document.createElement('span');
          dueLabel.textContent = 'Due date and time';
          const dueInput = document.createElement('input');
          dueInput.className = 'input';
          dueInput.type = 'datetime-local';
          dueInput.setAttribute('aria-label', `Edit due date for ${candidate.title}`);
          dueInput.value = (candidateEdits[candidate.id] || {}).dueDate ?? '';
          dueInput.oninput = (e) => {
            candidateEdits[candidate.id] = { ...(candidateEdits[candidate.id] || {}), title: (candidateEdits[candidate.id] || {}).title ?? candidate.title, dueDate: e.target.value, isAmbiguous: (candidateEdits[candidate.id] || {}).isAmbiguous ?? candidate.is_ambiguous };
          };
          dueField.appendChild(dueLabel);
          dueField.appendChild(dueInput);
          fields.appendChild(dueField);

          if (candidate.candidate_type === 'deadline' && !candidate.suggested_due_date) {
            const help = document.createElement('span');
            help.className = 'proposal-help-text';
            help.textContent = 'No date was found in the email. Add one before approving this deadline.';
            fields.appendChild(help);
          }
          if (candidate.candidate_type === 'deadline' && candidate.is_ambiguous && candidate.suggested_due_date) {
            const confirmLabel = document.createElement('label');
            confirmLabel.className = 'proposal-confirm-date';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = !((candidateEdits[candidate.id] || {}).isAmbiguous);
            cb.onchange = (e) => {
              candidateEdits[candidate.id] = { ...(candidateEdits[candidate.id] || {}), title: (candidateEdits[candidate.id] || {}).title ?? candidate.title, dueDate: (candidateEdits[candidate.id] || {}).dueDate ?? '', isAmbiguous: !e.target.checked };
            };
            const txt = document.createTextNode(`I confirmed this date${candidate.original_date_text ? ` ("${candidate.original_date_text}")` : ''}`);
            confirmLabel.appendChild(cb);
            confirmLabel.appendChild(txt);
            fields.appendChild(confirmLabel);
          }
          content.appendChild(fields);
        }

        const evidence = document.createElement('div');
        evidence.className = 'proposal-evidence';
        evidence.textContent = `"${candidate.supporting_evidence}"`;
        content.appendChild(meta);
        content.appendChild(cTitle);
        content.appendChild(evidence);

        const propActions = document.createElement('div');
        propActions.className = 'proposal-actions';
        if (candidate.validation_status === 'pending_review') {
          const approveBtn = Button({ children: 'Approve', size: 'sm', variant: 'primary', onClick: () => handleReviewAction(candidate.id, 'approve'), icon: 'check' });
          const rejectBtn = Button({ children: 'Reject', size: 'sm', variant: 'danger', onClick: () => handleReviewAction(candidate.id, 'reject'), icon: 'x' });
          propActions.appendChild(approveBtn);
          propActions.appendChild(rejectBtn);
        } else {
          const span = document.createElement('span');
          span.className = `badge ${isApproved ? 'proposal-status-approved' : 'proposal-status-rejected'}`;
          span.textContent = candidate.validation_status.toUpperCase();
          propActions.appendChild(span);
        }
        layout.appendChild(content);
        layout.appendChild(propActions);
        card.appendChild(layout);
        list.appendChild(card);
      });
      review.appendChild(list);
    }

    const closeAction = document.createElement('div');
    closeAction.className = 'proposal-close-action';
    const closeBtn = Button({ children: 'Close', variant: 'outline', onClick: () => { isModalOpen = false; renderPage(); } });
    closeAction.appendChild(closeBtn);
    review.appendChild(closeAction);

    const dialog = modal.querySelector('.card');
    dialog.appendChild(review);
    container.appendChild(modal);
  }

  }

  renderPage();
  fetchInbox();
  return container;
}
