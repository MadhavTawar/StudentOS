import React, { useCallback, useState, useEffect } from 'react';
import {
  Plus,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  CalendarDays,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { Deadline, Task } from '../types';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const DeadlinesPage: React.FC = () => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('Assignment');
  const [dueDate, setDueDate] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isAmbiguous, setIsAmbiguous] = useState(false);
  const [originalDateText, setOriginalDateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Deletion Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dList, tList] = await Promise.all([
        api.listDeadlines({
          event_type: eventTypeFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.listTasks({ status: 'Active' }),
      ]);
      setDeadlines(dList);
      setTasks(tList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deadlines.');
    } finally {
      setIsLoading(false);
    }
  }, [eventTypeFilter, statusFilter]);

  useEffect(() => {
    void Promise.resolve().then(fetchDeadlines);
  }, [fetchDeadlines]);

  const openCreateModal = () => {
    setEditingDeadline(null);
    setTitle('');
    setDescription('');
    setEventType('Assignment');
    setDueDate('');
    setTaskId('');
    setIsAmbiguous(false);
    setOriginalDateText('');
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Deadline) => {
    setEditingDeadline(d);
    setTitle(d.title);
    setDescription(d.description || '');
    setEventType(d.event_type);
    setDueDate(new Date(d.due_date).toISOString().slice(0, 16));
    setTaskId(d.task_id || '');
    setIsAmbiguous(d.is_ambiguous);
    setOriginalDateText(d.original_date_text || '');
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const handleTitleOrDateChange = async (newTitle: string, newDueDate: string) => {
    if (newTitle.trim().length > 3 && newDueDate && !editingDeadline) {
      try {
        const check = await api.checkDeadlineDuplicate({
          title: newTitle.trim(),
          due_date: new Date(newDueDate).toISOString(),
        });
        if (check.is_duplicate) {
          setDuplicateWarning(check.message || 'Possible duplicate deadline found.');
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Deadline> = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        due_date: new Date(dueDate).toISOString(),
        task_id: taskId || undefined,
        is_ambiguous: isAmbiguous,
        original_date_text: isAmbiguous ? originalDateText : undefined,
      };

      if (editingDeadline) {
        await api.updateDeadline(editingDeadline.id, payload);
      } else {
        await api.createDeadline(payload);
      }

      setIsModalOpen(false);
      fetchDeadlines();
    } catch (err: any) {
      alert(err.message || 'Failed to save deadline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.deleteDeadline(deletingId);
      setDeadlines((prev) => prev.filter((d) => d.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Academic Deadlines
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Chronological calendar and tracking for assignment submissions, examinations, and placement deadlines.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={<Plus size={16} />}>
          New Deadline
        </Button>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          padding: '0.875rem 1rem',
        }}
      >
        <select
          className="input"
          style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
        >
          <option value="">All Event Types</option>
          <option value="Assignment">Assignment</option>
          <option value="Examination">Examination</option>
          <option value="Placement">Placement</option>
          <option value="Interview">Interview</option>
          <option value="Project">Project</option>
          <option value="Registration">Registration</option>
        </select>

        <select
          className="input"
          style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Due Soon">Due Soon</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Deadlines List */}
      {isLoading ? (
        <LoadingSkeleton rows={5} height="75px" />
      ) : error ? (
        <EmptyState
          icon={<AlertCircle size={28} />}
          title="Could not load deadlines"
          description={error}
          action={<Button onClick={fetchDeadlines}>Retry</Button>}
        />
      ) : deadlines.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="No deadlines recorded"
          description="Schedule upcoming examination dates or assignment due dates to receive automated reminders."
          action={<Button variant="primary" onClick={openCreateModal}>Add First Deadline</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {deadlines.map((deadline) => {
            const isDueSoon = deadline.status === 'Due Soon';
            const isOverdue = deadline.status === 'Overdue';

            return (
              <div
                key={deadline.id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  gap: '1rem',
                  borderLeft: isOverdue
                    ? '4px solid var(--accent-danger)'
                    : isDueSoon
                    ? '4px solid var(--accent-warning)'
                    : '4px solid var(--border-card)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {deadline.title}
                    </span>
                    {deadline.is_ambiguous && (
                      <span
                        className="badge"
                        title={`Ambiguous date extracted: "${deadline.original_date_text || 'relative text'}". Requires confirmation.`}
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
                      >
                        <HelpCircle size={12} /> Ambiguous Date
                      </span>
                    )}
                  </div>

                  {deadline.description && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {deadline.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: isOverdue ? '#f87171' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={14} />
                      {new Date(deadline.due_date).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <span
                      className="badge"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}
                    >
                      {deadline.event_type}
                    </span>

                    <StatusBadge status={deadline.status} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => openEditModal(deadline)}
                    className="btn btn-outline btn-icon btn-sm"
                    title="Edit deadline"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingId(deadline.id)}
                    className="btn btn-danger btn-icon btn-sm"
                    title="Delete deadline"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDeadline ? 'Edit Academic Deadline' : 'Schedule Academic Deadline'}
        description="Preserve exact due dates and event metadata."
      >
        <form onSubmit={handleSaveDeadline} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {duplicateWarning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontSize: '0.8125rem',
              }}
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div>
            <label className="label" htmlFor="deadlineTitle">
              Event / Assignment Title *
            </label>
            <input
              id="deadlineTitle"
              required
              className="input"
              placeholder="e.g., Operating Systems Midterm Examination"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleTitleOrDateChange(e.target.value, dueDate);
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="eventType">
                Event Type
              </label>
              <select
                id="eventType"
                className="input"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="Assignment">Assignment</option>
                <option value="Examination">Examination</option>
                <option value="Placement">Placement</option>
                <option value="Interview">Interview</option>
                <option value="Project">Project</option>
                <option value="Registration">Registration</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="deadlineDate">
                Due Date & Time *
              </label>
              <input
                id="deadlineDate"
                type="datetime-local"
                required
                className="input"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleTitleOrDateChange(title, e.target.value);
                }}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="linkedTask">
              Associate with Existing Task (Optional)
            </label>
            <select
              id="linkedTask"
              className="input"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">None (Independent Deadline)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.priority})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="deadlineDesc">
              Description / Location / Rules
            </label>
            <textarea
              id="deadlineDesc"
              rows={2}
              className="input"
              placeholder="e.g., Hall B, closed-book exam, bring student ID card."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Ambiguity Flag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.25rem' }}>
            <input
              id="ambiguousCheck"
              type="checkbox"
              checked={isAmbiguous}
              onChange={(e) => setIsAmbiguous(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <label htmlFor="ambiguousCheck" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Mark date as ambiguous (e.g. extracted from "next Friday" or approximate schedule)
            </label>
          </div>

          {isAmbiguous && (
            <div>
              <label className="label" htmlFor="originalDateText">
                Original Text / Note
              </label>
              <input
                id="originalDateText"
                className="input"
                placeholder="e.g., Instructor mentioned 'next Friday before midnight'"
                value={originalDateText}
                onChange={(e) => setOriginalDateText(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingDeadline ? 'Save Changes' : 'Schedule Deadline'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Deadline"
        description="Are you sure you want to delete this deadline? Associated reminders will also be cancelled."
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="outline" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Confirm Deletion
          </Button>
        </div>
      </Modal>
    </div>
  );
};
