import React, { useCallback, useState, useEffect } from 'react';
import {
  Plus,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  CalendarDays,
  HelpCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Deadline, Task } from '../types';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [todayDateKey] = useState(() => localDateKey(new Date()));

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

  const calendarCells = Array.from({ length: 42 }, (_, index) =>
    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - calendarMonth.getDay() + index),
  );
  const selectedDateKey = localDateKey(selectedDate);
  const selectedTasks = tasks.filter((task) => task.due_date && localDateKey(new Date(task.due_date)) === selectedDateKey);
  const selectedDeadlines = deadlines.filter((deadline) => localDateKey(new Date(deadline.due_date)) === selectedDateKey);
  const activeCount = tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled').length;

  return (
    <div className="productivity-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1 className="page-title">
            Academic Deadlines
          </h1>
          <p className="page-description">
            Chronological calendar and tracking for assignment submissions, examinations, and placement deadlines.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={<Plus size={16} />}>
          New Deadline
        </Button>
      </div>

      {/* Filter Bar */}
      <div
        className="card planner-toolbar deadline-filters"
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

      <section className="planner-calendar-layout" aria-label="Monthly study calendar">
        <div className="card planner-calendar-card">
          <div className="planner-calendar-header">
            <div>
              <span className="planner-calendar-eyebrow">YOUR SCHEDULE</span>
              <h2>{calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="planner-calendar-controls">
              <button type="button" aria-label="Previous month" onClick={() => {
                const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                setCalendarMonth(nextMonth);
                if (selectedDate.getMonth() !== nextMonth.getMonth() || selectedDate.getFullYear() !== nextMonth.getFullYear()) setSelectedDate(nextMonth);
              }}><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Next month" onClick={() => {
                const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                setCalendarMonth(nextMonth);
                if (selectedDate.getMonth() !== nextMonth.getMonth() || selectedDate.getFullYear() !== nextMonth.getFullYear()) setSelectedDate(nextMonth);
              }}><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="planner-calendar-grid" role="group" aria-label="Select a date">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span aria-hidden="true" className="planner-calendar-weekday" key={day}>{day}</span>)}
            {calendarCells.map((day) => {
              const key = localDateKey(day);
              const dayTasks = tasks.filter((task) => task.due_date && localDateKey(new Date(task.due_date)) === key);
              const dayDeadlines = deadlines.filter((deadline) => localDateKey(new Date(deadline.due_date)) === key);
              const hasEvents = dayTasks.length + dayDeadlines.length > 0;
              return (
                <button
                  type="button"
                  key={key}
                  className={`planner-calendar-day${day.getMonth() === calendarMonth.getMonth() ? '' : ' is-outside'}${key === todayDateKey ? ' is-today' : ''}${key === selectedDateKey ? ' is-selected' : ''}${hasEvents ? ' has-events' : ''}`}
                  aria-label={`${day.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}${hasEvents ? `, ${dayTasks.length + dayDeadlines.length} scheduled items` : ''}`}
                  aria-pressed={key === selectedDateKey}
                  onClick={() => {
                    setSelectedDate(day);
                    if (day.getMonth() !== calendarMonth.getMonth()) setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                  }}
                >
                  <span>{day.getDate()}</span>
                  {hasEvents && <span className="planner-calendar-count">{dayTasks.length + dayDeadlines.length}</span>}
                </button>
              );
            })}
          </div>
          <div className="planner-selected-day">
            <div className="planner-selected-day-heading">
              <div><span className="planner-calendar-eyebrow">SELECTED DAY</span><h3>{selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h3></div>
              <Button variant="outline" onClick={openCreateModal} icon={<Plus size={15} />}>Deadline</Button>
            </div>
            {selectedTasks.length + selectedDeadlines.length === 0 ? (
              <p className="planner-selected-day-empty">{isLoading ? 'Loading tasks and deadlines…' : error ? 'Schedule items could not be loaded.' : 'No tasks or deadlines are scheduled for this date.'}</p>
            ) : (
              <ul className="planner-selected-events">
                {selectedTasks.map((task) => (
                  <li key={`task-${task.id}`}>
                    <label className="planner-event-task">
                      <input type="checkbox" checked={task.status === 'Completed'} aria-label={`Complete ${task.title}`} onChange={async () => {
                        try {
                          const updated = await api.toggleTask(task.id);
                          setTasks((items) => items.map((item) => item.id === updated.id ? updated : item));
                        } catch (toggleError) {
                          setError(toggleError instanceof Error ? toggleError.message : 'Could not update task.');
                        }
                      }} />
                      <span><strong>{task.title}</strong><small>Task{task.estimated_duration ? ` · ${task.estimated_duration} min` : ''}</small></span>
                    </label>
                  </li>
                ))}
                {selectedDeadlines.map((deadline) => (
                  <li key={`deadline-${deadline.id}`}><span className="planner-event-deadline-mark" /><span className="planner-event-copy"><strong>{deadline.title}</strong><small>Deadline · {new Date(deadline.due_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></span><StatusBadge status={deadline.status} /></li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="planner-context-column" aria-label="Study context and quick actions">
          <section className="card planner-context-card">
            <span className="planner-context-icon"><CheckSquare size={17} /></span>
            <div><span className="planner-calendar-eyebrow">ACTIVE WORK</span><strong>{activeCount}</strong><p>Tasks that still need attention</p></div>
            <Link to="/app/planner?view=tasks" aria-label="View all tasks">View tasks <ChevronRight size={15} /></Link>
          </section>
          <section className="card planner-context-card">
            <span className="planner-context-icon is-deadline"><CalendarDays size={17} /></span>
            <div><span className="planner-calendar-eyebrow">UPCOMING</span><strong>{deadlines.filter((item) => item.status !== 'Completed').length}</strong><p>Deadlines in this schedule</p></div>
            <span className="planner-context-caption">Based on your saved deadlines</span>
          </section>
          <section className="card planner-context-card planner-context-action">
            <span className="planner-context-icon is-ai"><BookOpen size={17} /></span>
            <div><strong>Need a study nudge?</strong><p>Ask the study companion to help prioritize your workload.</p></div>
            <Link to="/app/assistant">Open study companion <ChevronRight size={15} /></Link>
          </section>
        </aside>
      </section>

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
        <div className="planner-list">
          {deadlines.map((deadline) => {
            const isDueSoon = deadline.status === 'Due Soon';
            const isOverdue = deadline.status === 'Overdue';

            return (
              <div
                key={deadline.id}
                className={`card card-hover deadline-row ${isOverdue ? 'is-overdue' : isDueSoon ? 'is-due-soon' : ''}`}
              >
                <div className="deadline-content">
                  <div className="deadline-title-row">
                    <span className="deadline-title">
                      {deadline.title}
                    </span>
                    {deadline.is_ambiguous && (
                      <span
                        title={`Ambiguous date extracted: "${deadline.original_date_text || 'relative text'}". Requires confirmation.`}
                        className="badge deadline-ambiguous"
                      >
                        <HelpCircle size={12} /> Ambiguous Date
                      </span>
                    )}
                  </div>

                  {deadline.description && (
                    <div className="deadline-description">
                      {deadline.description}
                    </div>
                  )}

                  <div className="deadline-meta">
                    <span
                      className={`deadline-date ${isOverdue ? 'is-overdue' : ''}`}
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
                      className="badge deadline-type"
                    >
                      {deadline.event_type}
                    </span>

                    <StatusBadge status={deadline.status} />
                  </div>
                </div>

                {/* Actions */}
                <div className="task-actions">
                  <button
                    type="button"
                    onClick={() => openEditModal(deadline)}
                    className="btn btn-outline btn-icon btn-sm"
                    title="Edit deadline"
                    aria-label={`Edit ${deadline.title}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(deadline.id)}
                    className="btn btn-danger btn-icon btn-sm"
                    title="Delete deadline"
                    aria-label={`Delete ${deadline.title}`}
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
