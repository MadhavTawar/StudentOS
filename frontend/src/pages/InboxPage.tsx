import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Sparkles,
  Search,
  ShieldCheck,
  Check,
  X,
  HelpCircle,
  Clock,
  Lock
} from 'lucide-react';
import { api } from '../lib/api';
import { EmailMessage, GmailStatus, AICandidate } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const InboxPage: React.FC = () => {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef('');

  // AI Extraction Modal State
  const [extractingEmail, setExtractingEmail] = useState<EmailMessage | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<AICandidate[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [candidateEdits, setCandidateEdits] = useState<Record<string, { title: string; dueDate: string; isAmbiguous: boolean }>>({});

  const fetchInbox = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusData = await api.getGmailStatus();
      setStatus(statusData);

      if (statusData.is_connected) {
        const msgs = await api.listGmailMessages(searchRef.current.trim() || undefined);
        setMessages(msgs.messages);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchInbox);
  }, [fetchInbox]);

  const handleConnectGmail = async () => {
    try {
      const { auth_url } = await api.getGmailAuthUrl();
      // If simulated local dev mock URL:
      if (auth_url.includes('code=') && auth_url.includes('state=')) {
        const urlObj = new URL(auth_url);
        const code = urlObj.searchParams.get('code') || '';
        const state = urlObj.searchParams.get('state') || '';
        await api.sendGmailCallback(code, state);
        fetchInbox();
      } else {
        // Redirect to real Google OAuth screen
        window.location.href = auth_url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Gmail authorization.');
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail? Your cached email previews will be cleared. (Tasks and deadlines you confirmed will remain safe).')) {
      return;
    }
    try {
      await api.disconnectGmail();
      fetchInbox();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect Gmail.');
    }
  };

  const handleExtractAI = async (email: EmailMessage) => {
    setExtractingEmail(email);
    setIsExtracting(true);
    setIsModalOpen(true);
    setReviewMessage(null);

    try {
      const candidates = await api.extractEmailCandidates({
        message_id: email.message_id,
        subject: email.subject,
        snippet: email.snippet || '',
        sender: email.sender,
      });
      setExtractedCandidates(candidates);
      setCandidateEdits(Object.fromEntries(candidates.map((candidate) => {
        const dueDate = candidate.suggested_due_date ? new Date(candidate.suggested_due_date) : null;
        if (dueDate) {
          dueDate.setMinutes(dueDate.getMinutes() - dueDate.getTimezoneOffset());
        }
        return [candidate.id, {
          title: candidate.title,
          dueDate: dueDate?.toISOString().slice(0, 16) || '',
          isAmbiguous: candidate.is_ambiguous,
        }];
      })));
    } catch (err: any) {
      setReviewMessage(err.message || 'AI extraction failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReviewAction = async (candidateId: string, action: 'approve' | 'reject') => {
    try {
      const edits = candidateEdits[candidateId];
      await api.reviewAICandidate(candidateId, action, {
        title: edits ? edits.title.trim() : undefined,
        suggested_due_date: edits?.dueDate ? new Date(edits.dueDate).toISOString() : undefined,
        is_ambiguous: edits?.isAmbiguous,
      });
      setExtractedCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, validation_status: action === 'approve' ? 'approved' : 'rejected' } : c))
      );
      setReviewMessage(
        action === 'approve'
          ? 'Approved! The proposal has been converted into an active task/deadline.'
          : 'Proposal rejected and dismissed.'
      );
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  return (
    <div className="inbox-page productivity-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1 className="page-title">
            Academic Inbox
          </h1>
          <p className="page-description">
            Read-only Gmail integration with assignment and examination suggestions. If AI_PROVIDER=groq, the selected email's subject, sender, and snippet are sent to Groq for extraction.
          </p>
        </div>

        {status?.is_connected ? (
          <div className="inbox-connection-actions">
            <span
              className="badge inbox-connected-badge"
            >
              <ShieldCheck size={14} /> Connected: {status.email_address}
            </span>
            <Button variant="danger" size="sm" onClick={handleDisconnectGmail}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={handleConnectGmail} icon={<Mail size={16} />}>
            Connect Gmail (Read-Only)
          </Button>
        )}
      </div>

      {/* Security & Scope Notice Banner */}
      <div
        className="card inbox-security-notice"
      >
        <Lock size={20} color="var(--accent-primary)" className="shrink-0" />
        <div className="inbox-security-copy">
          <div className="inbox-security-title">
            Least-Privilege Gmail Security Controls
          </div>
          <div className="inbox-security-description">
            StudentOS requests strictly <strong>read-only access</strong> (<code>gmail.readonly</code>). We never request
            permission to send, modify, or delete your emails. Extracted action items require your explicit confirmation before saving.
          </div>
        </div>
      </div>

      {/* Main Inbox View */}
      {!status?.is_connected ? (
        <EmptyState
          icon={<Mail size={36} />}
          title="Connect your Gmail"
          description="Link a mailbox with read-only permissions to find messages that may contain tasks and deadlines."
          action={
            <Button variant="primary" onClick={handleConnectGmail} icon={<Mail size={16} />}>
              Connect Gmail (Read-Only)
            </Button>
          }
        />
      ) : (
        <div className="inbox-content">
          {/* Search Bar */}
          <div
            className="card inbox-toolbar"
          >
            <div className="inbox-search-field">
              <input
                type="text"
                className="input"
                placeholder="Search emails by sender or subject..."
                value={search}
                onChange={(e) => {
                  searchRef.current = e.target.value;
                  setSearch(e.target.value);
                }}
                onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                style={{ paddingLeft: '2.25rem' }}
                aria-label="Search emails"
              />
              <Search
                size={16}
                color="var(--text-dim)"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            <Button variant="outline" size="sm" onClick={fetchInbox} icon={<RefreshCw size={14} />}>
              Refresh Inbox
            </Button>
          </div>

          {/* Email Messages List */}
          {isLoading ? (
            <LoadingSkeleton rows={4} height="85px" />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<Mail size={32} />}
              title="No messages found"
              description="No relevant messages matched your search."
            />
          ) : (
            <div className="inbox-message-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="card card-hover inbox-message-row"
                >
                  <div className="inbox-message-content">
                    <div className="inbox-message-meta">
                      <span className="inbox-sender">
                        {msg.sender}
                      </span>
                      <span className="inbox-message-time">
                        {new Date(msg.internal_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="inbox-message-subject">
                      {msg.subject}
                    </div>

                    <div className="inbox-message-snippet">
                      {msg.snippet}
                    </div>
                  </div>

                  {/* Extract Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleExtractAI(msg)}
                    icon={<Sparkles size={14} />}
                  >
                    Extract Proposals
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Extraction Candidate Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="AI Candidate Review & Verification"
        description="Verify extracted tasks and deadlines before adding to your schedule."
        maxWidth="max-w-2xl"
      >
        <div className="proposal-review">
          {/* Source Email Banner */}
          {extractingEmail && (
            <div
              className="proposal-source"
            >
              <div className="proposal-source-label">SOURCE EMAIL</div>
              <div className="proposal-source-subject">
                {extractingEmail.subject}
              </div>
              <div className="proposal-source-sender">
                From: {extractingEmail.sender}
              </div>
            </div>
          )}

          {reviewMessage && (
            <div
              className="proposal-review-message"
            >
              {reviewMessage}
            </div>
          )}

          {isExtracting ? (
            <div className="proposal-loading">
              <LoadingSkeleton rows={3} height="45px" />
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Analyzing email with prompt-injection defense and extracting structured proposals...
              </p>
            </div>
          ) : extractedCandidates.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={28} />}
              title="No action items found"
              description="No explicit assignments, deadlines, or examinations were identified in this email."
            />
          ) : (
            <div className="proposal-list" aria-label="Email extraction proposals">
              {extractedCandidates.map((candidate) => {
                const isApproved = candidate.validation_status === 'approved';
                const isRejected = candidate.validation_status === 'rejected';

                return (
                  <div
                    key={candidate.id}
                    className={`proposal-card ${isApproved ? 'is-approved' : isRejected ? 'is-rejected' : 'is-pending'}`}
                  >
                    <div className="proposal-card-layout">
                      <div className="proposal-card-content">
                        <div className="proposal-card-meta">
                          <span
                            className={`badge ${candidate.candidate_type === 'task' ? 'proposal-type-task' : 'proposal-type-deadline'}`}
                          >
                            PROPOSED {candidate.candidate_type.toUpperCase()}
                          </span>
                          <span className="proposal-confidence">
                            Confidence: {Math.round(candidate.confidence_score * 100)}%
                          </span>
                        </div>

                        <div className="proposal-title">
                          {candidate.title}
                        </div>

                        {candidate.suggested_due_date && (
                          <div className="proposal-due-date">
                            <Clock size={14} />
                            Suggested Due Date: {new Date(candidate.suggested_due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}

                        {candidate.validation_status === 'pending_review' && (
                          <div className="proposal-edit-fields">
                            <label className="proposal-edit-field">
                              Title
                              <input
                                className="input"
                                aria-label={`Edit title for ${candidate.title}`}
                                value={candidateEdits[candidate.id]?.title ?? candidate.title}
                                onChange={(event) => setCandidateEdits((current) => ({
                                  ...current,
                                  [candidate.id]: {
                                    title: event.target.value,
                                    dueDate: current[candidate.id]?.dueDate ?? '',
                                    isAmbiguous: current[candidate.id]?.isAmbiguous ?? candidate.is_ambiguous,
                                  },
                                }))}
                              />
                            </label>
                            <label className="proposal-edit-field">
                              Due date and time
                              <input
                                className="input"
                                type="datetime-local"
                                aria-label={`Edit due date for ${candidate.title}`}
                                value={candidateEdits[candidate.id]?.dueDate ?? ''}
                                onChange={(event) => setCandidateEdits((current) => ({
                                  ...current,
                                  [candidate.id]: {
                                    title: current[candidate.id]?.title ?? candidate.title,
                                    dueDate: event.target.value,
                                    isAmbiguous: current[candidate.id]?.isAmbiguous ?? candidate.is_ambiguous,
                                  },
                                }))}
                              />
                            </label>
                            {candidate.candidate_type === 'deadline' && !candidate.suggested_due_date && (
                              <span className="proposal-help-text">
                                No date was found in the email. Add one before approving this deadline.
                              </span>
                            )}
                            {candidate.candidate_type === 'deadline' && candidate.is_ambiguous && candidate.suggested_due_date && (
                              <label className="proposal-confirm-date">
                                <input
                                  type="checkbox"
                                  checked={!candidateEdits[candidate.id]?.isAmbiguous}
                                  onChange={(event) => setCandidateEdits((current) => ({
                                    ...current,
                                    [candidate.id]: {
                                      title: current[candidate.id]?.title ?? candidate.title,
                                      dueDate: current[candidate.id]?.dueDate ?? '',
                                      isAmbiguous: !event.target.checked,
                                    },
                                  }))}
                                />
                                I confirmed this date{candidate.original_date_text ? ` ("${candidate.original_date_text}")` : ''}
                              </label>
                            )}
                          </div>
                        )}

                        {/* Quoted Evidence */}
                        <div
                          className="proposal-evidence"
                        >
                          "{candidate.supporting_evidence}"
                        </div>
                      </div>

                      {/* Approval Controls */}
                      <div className="proposal-actions">
                        {candidate.validation_status === 'pending_review' ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleReviewAction(candidate.id, 'approve')}
                              icon={<Check size={14} />}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleReviewAction(candidate.id, 'reject')}
                              icon={<X size={14} />}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span
                            className={`badge ${isApproved ? 'proposal-status-approved' : 'proposal-status-rejected'}`}
                          >
                            {candidate.validation_status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="proposal-close-action">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
