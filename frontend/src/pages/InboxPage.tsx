import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronRight,
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // AI Extraction Modal State
  const [extractingEmail, setExtractingEmail] = useState<EmailMessage | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<AICandidate[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [candidateEdits, setCandidateEdits] = useState<Record<string, { title: string; dueDate: string }>>({});

  const fetchInbox = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusData = await api.getGmailStatus();
      setStatus(statusData);

      if (statusData.is_connected) {
        const msgs = await api.listGmailMessages(search.trim() || undefined);
        setMessages(msgs.messages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inbox information.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Academic Inbox
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Read-only Gmail integration with assignment and examination suggestions. If AI_PROVIDER=groq, the selected email's subject, sender, and snippet are sent to Groq for extraction.
          </p>
        </div>

        {status?.is_connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.4rem 0.75rem',
              }}
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
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
        }}
      >
        <Lock size={20} color="var(--accent-primary)" className="shrink-0" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
            Least-Privilege Gmail Security Controls
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Bar */}
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
            }}
          >
            <div style={{ position: 'relative', width: '340px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search emails by sender or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                style={{ paddingLeft: '2.25rem' }}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="card card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                        {msg.sender}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(msg.internal_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                      {msg.subject}
                    </div>

                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Source Email Banner */}
          {extractingEmail && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>SOURCE EMAIL</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                {extractingEmail.subject}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                From: {extractingEmail.sender}
              </div>
            </div>
          )}

          {reviewMessage && (
            <div
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#ffffff',
                fontSize: '0.8125rem',
              }}
            >
              {reviewMessage}
            </div>
          )}

          {isExtracting ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {extractedCandidates.map((candidate) => {
                const isApproved = candidate.validation_status === 'approved';
                const isRejected = candidate.validation_status === 'rejected';

                return (
                  <div
                    key={candidate.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid',
                      borderColor: isApproved
                        ? 'var(--accent-success)'
                        : isRejected
                        ? 'var(--accent-danger)'
                        : 'var(--border-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: candidate.candidate_type === 'task' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                              color: candidate.candidate_type === 'task' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                            }}
                          >
                            PROPOSED {candidate.candidate_type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Confidence: {Math.round(candidate.confidence_score * 100)}%
                          </span>
                        </div>

                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff' }}>
                          {candidate.title}
                        </div>

                        {candidate.suggested_due_date && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--accent-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} />
                            Suggested Due Date: {new Date(candidate.suggested_due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}

                        {candidate.validation_status === 'pending_review' && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <label style={{ display: 'grid', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
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
                                  },
                                }))}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
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
                                  },
                                }))}
                              />
                            </label>
                            {candidate.candidate_type === 'deadline' && !candidate.suggested_due_date && (
                              <span style={{ alignSelf: 'end', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                No date was found in the email. Add one before approving this deadline.
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quoted Evidence */}
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            borderLeft: '3px solid var(--accent-primary)',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                          }}
                        >
                          "{candidate.supporting_evidence}"
                        </div>
                      </div>

                      {/* Approval Controls */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                            className="badge"
                            style={{
                              backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isApproved ? '#34d399' : '#f87171',
                            }}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
