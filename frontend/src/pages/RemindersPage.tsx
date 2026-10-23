import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Plus, Clock, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Reminder, Deadline } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(60);
  const [selectedDeadlineId, setSelectedDeadlineId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rems, dlines] = await Promise.all([
        api.listReminders(),
        api.listDeadlines({ upcoming_only: true }),
      ]);
      setReminders(rems);
      setDeadlines(dlines);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reminders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchReminders);
  }, [fetchReminders]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    setIsSubmitting(true);
    try {
      await api.createReminder({
        title: title.trim(),
        message: message.trim() || undefined,
        remind_at: new Date(remindAt).toISOString(),
        lead_time_minutes: leadTimeMinutes,
        deadline_id: selectedDeadlineId || undefined,
        task_id: selectedTaskId || undefined,
      });
      setIsModalOpen(false);
      setTitle('');
      setMessage('');
      setRemindAt('');
      setSelectedDeadlineId('');
      setSelectedTaskId('');
      fetchReminders();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissReminder(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Dismissed' } : r)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="productivity-page reminders-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1 className="page-title">
            Reminders & Alerts
          </h1>
          <p className="page-description">
            Manage persistent in-app study reminders and automated deadline notifications.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<Plus size={16} />}>
          Schedule Reminder
        </Button>
      </div>

      {/* Reminders List */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="70px" />
      ) : error ? (
        <EmptyState
          icon={<AlertCircle size={28} />}
          title="Could not load reminders"
          description={error}
          action={<Button onClick={fetchReminders}>Retry</Button>}
        />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} />}
          title="No scheduled reminders"
          description="Schedule a reminder for assignment submissions or exam study sessions."
          action={<Button variant="primary" onClick={() => setIsModalOpen(true)}>Create First Reminder</Button>}
        />
      ) : (
        <div className="planner-list">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`card card-hover reminder-row ${reminder.status === 'Dismissed' ? 'is-dismissed' : ''}`}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                    {reminder.title}
                  </span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: reminder.status === 'Pending' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: reminder.status === 'Pending' ? 'var(--accent-primary)' : 'var(--text-dim)',
                    }}
                  >
                    {reminder.status}
                  </span>
                </div>

                {reminder.message && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {reminder.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    Remind at: {new Date(reminder.remind_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span>Lead Time: {reminder.lead_time_minutes} mins</span>
                </div>
              </div>

              {reminder.status === 'Pending' && (
                <Button size="sm" variant="outline" onClick={() => handleDismiss(reminder.id)}>
                  Dismiss
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule Reminder Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule In-App Reminder"
        description="Set a time-zone aware persistent reminder."
      >
        <form onSubmit={handleCreateReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="remTitle">
              Reminder Title *
            </label>
            <input
              id="remTitle"
              required
              className="input"
              placeholder="e.g., Submit Assignment 2 on portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="remMessage">
              Optional Message / Notes
            </label>
            <textarea
              id="remMessage"
              rows={2}
              className="input"
              placeholder="Check PDF formatting and upload code zip file."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="remTime">
                Remind At (Date & Time) *
              </label>
              <input
                id="remTime"
                type="datetime-local"
                required
                className="input"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="remLead">
                Lead Time (Minutes before event)
              </label>
              <select
                id="remLead"
                className="input"
                value={leadTimeMinutes}
                onChange={(e) => setLeadTimeMinutes(parseInt(e.target.value, 10))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>24 hours (1 day)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="remDeadline">
              Link to Academic Deadline (Optional)
            </label>
            <select
              id="remDeadline"
              className="input"
              value={selectedDeadlineId}
              onChange={(e) => setSelectedDeadlineId(e.target.value)}
            >
              <option value="">None</option>
              {deadlines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({new Date(d.due_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Schedule Reminder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
