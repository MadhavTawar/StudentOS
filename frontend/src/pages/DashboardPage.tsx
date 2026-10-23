import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import { DashboardOverview, Goal } from '../types';
import { Button } from '../components/common/Button';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Modal } from '../components/common/Modal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [currentDate] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Assignment');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overview, goalList] = await Promise.all([
        api.getDashboardOverview(),
        api.listGoals(),
      ]);
      setData(overview);
      setGoals(goalList);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchDashboard);
  }, [fetchDashboard]);

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleTask(taskId);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createTask({
        title: taskTitle.trim(),
        category: taskCategory,
        priority: taskPriority,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });
      setIsQuickTaskOpen(false);
      setTaskTitle('');
      setTaskDueDate('');
      fetchDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const dateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const calendarCells = Array.from({ length: 42 }, (_, index) =>
    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - calendarMonth.getDay() + index),
  );

  if (!data) {
    if (isLoading) {
      return (
        <div className="dashboard-page dashboard-loading">
          <div className="dashboard-loading-row animate-pulse-glow" />
          <LoadingSkeleton rows={4} height="90px" />
        </div>
      );
    }
    return (
      <EmptyState
        icon={<AlertCircle size={32} />}
        title="Could not load dashboard"
        description={error || 'Unable to fetch academic overview.'}
        action={
          <Button variant="primary" onClick={fetchDashboard} icon={<RefreshCw size={16} />}>
            Retry
          </Button>
        }
      />
    );
  }

  const activeTasksCount = data.stats.pending + data.stats.in_progress;
  const upcomingCount = data.upcoming_deadlines.length;
  const overdueCount = data.stats.overdue;
  const completedCount = data.stats.completed;

  const markedDates = new Set([
    ...data.pending_tasks.flatMap((task) => (task.due_date ? [dateKey(new Date(task.due_date))] : [])),
    ...data.upcoming_deadlines.map((deadline) => dateKey(new Date(deadline.due_date))),
  ]);
  const selectedDateKey = dateKey(selectedCalendarDate);
  const selectedDayTasks = data.pending_tasks.filter((task) => task.due_date && dateKey(new Date(task.due_date)) === selectedDateKey);
  const selectedDayDeadlines = data.upcoming_deadlines.filter((deadline) => dateKey(new Date(deadline.due_date)) === selectedDateKey);

  const hourGroups = new Map<string, { label: string; tasks: any[] }>();
  const anytimeTasks: any[] = [];
  data.pending_tasks.forEach((task) => {
    if (task.due_date) {
      const d = new Date(task.due_date);
      const key = String(d.getHours()).padStart(2, '0');
      const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!hourGroups.has(key)) hourGroups.set(key, { label, tasks: [] });
      hourGroups.get(key)!.tasks.push(task);
    } else {
      anytimeTasks.push(task);
    }
  });

  const statTiles = [
    {
      label: 'Active tasks',
      value: activeTasksCount,
      caption: `${data.stats.pending} pending · ${data.stats.in_progress} in progress`,
      icon: <CheckSquare size={20} />,
      accent: 'var(--accent-primary)',
    },
    {
      label: 'Upcoming deadlines',
      value: upcomingCount,
      caption: 'Next 7 academic days',
      icon: <Calendar size={20} />,
      accent: 'var(--accent-secondary)',
    },
    {
      label: 'Overdue tasks',
      value: overdueCount,
      caption: overdueCount > 0 ? 'Requires immediate focus' : 'All caught up',
      icon: <AlertCircle size={20} />,
      accent: 'var(--accent-danger)',
    },
    {
      label: 'Completed tasks',
      value: completedCount,
      caption: `${data.stats.pending + data.stats.in_progress} remaining`,
      icon: <CheckCircle2 size={20} />,
      accent: 'var(--accent-success)',
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Greeting header */}
      <header className="dashboard-masthead">
        <div className="dashboard-welcome">
          <div className="dashboard-kicker">YOUR STUDY LIFE, IN ONE PLACE</div>
          <h1 className="dashboard-title">{getGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'}</h1>
          <p className="dashboard-subtitle">Every task you complete is a step closer to your goals.</p>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-date-stamp">
            <Calendar size={15} />
            <span>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <Button variant="primary" onClick={() => setIsQuickTaskOpen(true)} icon={<Plus size={16} />}>
            Add task
          </Button>
        </div>
      </header>

      {/* Stats cards */}
      <div className="dashboard-stats">
        {statTiles.map((tile) => (
          <div key={tile.label} className="dashboard-stat" data-accent={tile.accent}>
            <div className="dashboard-stat-body">
              <div className="dashboard-stat-label">{tile.label}</div>
              <div className="dashboard-stat-value">{tile.value}</div>
              <div className="dashboard-stat-caption">{tile.caption}</div>
            </div>
            <div className="dashboard-stat-icon" style={{ color: tile.accent }}>
              {tile.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Left column */}
        <div className="dashboard-left">
          {/* Today timeline */}
          <section className="card dashboard-card dashboard-today">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title-row">
                <div className="dashboard-card-icon"><Clock size={18} /></div>
                <h2 className="dashboard-card-title">Today</h2>
              </div>
              <Link to="/app/planner" className="dashboard-card-link">Open planner <ArrowRight size={13} /></Link>
            </div>
            <div className="dashboard-timeline">
              {Array.from(hourGroups.entries()).map(([key, { label, tasks }]) => (
                <div key={key} className="dashboard-timeline-slot">
                  <span className="dashboard-timeline-time">{label}</span>
                  <div className="dashboard-timeline-items">
                    {tasks.map((task) => (
                      <div key={task.id} className="dashboard-timeline-item">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          aria-label={`Complete ${task.title}`}
                          onChange={() => handleToggleTask(task.id)}
                          className="dashboard-checkbox"
                        />
                        <div className="dashboard-timeline-item-body">
                          <div className="dashboard-timeline-item-title">{task.title}</div>
                          {task.due_date && (
                            <div className="dashboard-timeline-item-meta">
                              {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {anytimeTasks.length > 0 && (
                <div className="dashboard-timeline-slot">
                  <span className="dashboard-timeline-time">Anytime</span>
                  <div className="dashboard-timeline-items">
                    {anytimeTasks.map((task) => (
                      <div key={task.id} className="dashboard-timeline-item">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          aria-label={`Complete ${task.title}`}
                          onChange={() => handleToggleTask(task.id)}
                          className="dashboard-checkbox"
                        />
                        <div className="dashboard-timeline-item-body">
                          <div className="dashboard-timeline-item-title">{task.title}</div>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hourGroups.size === 0 && anytimeTasks.length === 0 && (
                <div className="dashboard-timeline-empty">No tasks scheduled for today.</div>
              )}
            </div>
          </section>

          {/* Tasks table */}
          <section className="card dashboard-card dashboard-tasks">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title-row">
                <div className="dashboard-card-icon"><CheckSquare size={18} /></div>
                <h2 className="dashboard-card-title">Active tasks</h2>
              </div>
              <Link to="/app/tasks" className="dashboard-card-link">View all <ArrowRight size={13} /></Link>
            </div>
            {data.pending_tasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title="No active tasks"
                description="You're all caught up! Use Add task to schedule new study tasks."
              />
            ) : (
              <div className="dashboard-task-table">
                {data.pending_tasks.map((task) => (
                  <div key={task.id} className="dashboard-task-row">
                    <div className="dashboard-task-main">
                      <input
                        type="checkbox"
                        checked={task.status === 'Completed'}
                        aria-label={`Complete ${task.title}`}
                        onChange={() => handleToggleTask(task.id)}
                        className="dashboard-checkbox"
                      />
                      <div className="dashboard-task-body">
                        <div className="dashboard-task-title">{task.title}</div>
                        {task.due_date && (
                          <div className="dashboard-task-meta">
                            <Clock size={12} className="dashboard-task-meta-icon" />
                            <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="dashboard-task-tags">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="dashboard-task-chevr">
                      <Link to={`/app/tasks/${task.id}`} className="dashboard-task-link">
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right rail */}
        <div className="dashboard-right">
          <section className="card dashboard-card dashboard-calendar">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title-row">
                <div className="dashboard-card-icon"><Calendar size={18} /></div>
                <h2 className="dashboard-card-title">Schedule</h2>
              </div>
              <div className="dashboard-calendar-controls">
                <button type="button" aria-label="Previous month" onClick={() => {
                  const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                  setCalendarMonth(next);
                  if (selectedCalendarDate.getMonth() !== next.getMonth() || selectedCalendarDate.getFullYear() !== next.getFullYear()) setSelectedCalendarDate(next);
                }}><ChevronLeft size={17} /></button>
                <button type="button" aria-label="Next month" onClick={() => {
                  const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                  setCalendarMonth(next);
                  if (selectedCalendarDate.getMonth() !== next.getMonth() || selectedCalendarDate.getFullYear() !== next.getFullYear()) setSelectedCalendarDate(next);
                }}><ChevronRight size={17} /></button>
              </div>
            </div>
            <div className="dashboard-calendar-heading">
              <div className="dashboard-calendar-month">{calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="dashboard-calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span className="dashboard-calendar-weekday" key={day} aria-hidden="true">{day}</span>
              ))}
              {calendarCells.map((day) => {
                const key = dateKey(day);
                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                const isToday = key === dateKey(currentDate);
                return (
                  <button
                    type="button"
                    key={key}
                    className={`dashboard-calendar-day${isCurrentMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${key === selectedDateKey ? ' is-selected' : ''}${markedDates.has(key) ? ' has-events' : ''}`}
                    aria-label={`${day.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}${markedDates.has(key) ? ', has scheduled work' : ''}`}
                    aria-pressed={key === selectedDateKey}
                    onClick={() => {
                      setSelectedCalendarDate(day);
                      if (!isCurrentMonth) setCalendarMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    }}
                  >
                    {day.getDate()}
                    {markedDates.has(key) && <span className="dashboard-calendar-dot" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="dashboard-calendar-selected">
              <div className="dashboard-calendar-selected-heading">
                <strong>{selectedCalendarDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
                <Link to="/app/planner?view=deadlines" className="dashboard-calendar-planner-link">
                  Planner <ArrowRight size={13} />
                </Link>
              </div>
              {selectedDayTasks.length + selectedDayDeadlines.length === 0 ? (
                <p className="dashboard-calendar-empty">No tasks or deadlines for this date.</p>
              ) : (
                <ul className="dashboard-calendar-list">
                  {selectedDayTasks.slice(0, 3).map((task) => (
                    <li key={`task-${task.id}`} className="dashboard-calendar-list-item">
                      <span className="dashboard-calendar-event-mark task-mark" />
                      {task.title}
                    </li>
                  ))}
                  {selectedDayDeadlines.slice(0, 3).map((deadline) => (
                    <li key={`deadline-${deadline.id}`} className="dashboard-calendar-list-item">
                      <span className="dashboard-calendar-event-mark deadline-mark" />
                      {deadline.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Goals */}
          <section className="card dashboard-card dashboard-goals">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title-row">
                <div className="dashboard-card-icon"><CheckSquare size={18} /></div>
                <h2 className="dashboard-card-title">Goals</h2>
              </div>
              <Link to="/app/goals" className="dashboard-card-link">Manage goals <ArrowRight size={13} /></Link>
            </div>
            {goals.length === 0 ? (
              <div className="dashboard-goals-empty">No goals yet. Create your first goal to track progress.</div>
            ) : (
              <div className="dashboard-goals-list">
                {goals
                  .filter((g) => g.status === 'Active')
                  .slice(0, 3)
                  .map((goal) => (
                    <div key={goal.id} className="dashboard-goal-row">
                      <div className="dashboard-goal-info">
                        <div className="dashboard-goal-title">{goal.title}</div>
                        <div className="dashboard-goal-caption">
                          {goal.completed_milestones} of {goal.total_milestones} milestones
                        </div>
                      </div>
                      <div className="dashboard-goal-progress">
                        <div
                          className="dashboard-goal-track"
                          role="progressbar"
                          aria-label={`${goal.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={goal.progress_percent}
                        >
                          <div
                            className="dashboard-goal-bar"
                            style={{ width: `${goal.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Compact attention + AI proposals strip */}
      <div className="dashboard-attention">
        <section className="card dashboard-card dashboard-attention-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title-row">
              <div className="dashboard-card-icon"><ArrowRight size={18} /></div>
              <h2 className="dashboard-card-title">What deserves attention next</h2>
            </div>
            <Link to="/app/planner" className="dashboard-card-link">Open planner <ArrowRight size={13} /></Link>
          </div>
          {data.daily_priorities.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title="Your plan is clear"
              description="Add a task or deadline when you know what you want to work on next."
              action={<Button variant="outline" onClick={() => setIsQuickTaskOpen(true)} icon={<Plus size={15} />}>Add a task</Button>}
            />
          ) : (
            <div className="dashboard-priorities">
              {data.daily_priorities.map(({ task, reason }) => (
                <div key={task.id} className="dashboard-priority-item">
                  <div className="dashboard-priority-body">
                    <div className="dashboard-priority-title">{task.title}</div>
                    <div className="dashboard-priority-reason">{reason}{task.due_date ? ` · ${new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card dashboard-card dashboard-proposals">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title-row">
              <div className="dashboard-card-icon"><AlertCircle size={18} /></div>
              <h2 className="dashboard-card-title">AI proposals waiting for approval</h2>
            </div>
            <Link to="/app/inbox" className="dashboard-card-link">Review inbox <ArrowRight size={13} /></Link>
          </div>
          {data.ai_proposals.length === 0 ? (
            <div className="dashboard-proposals-empty">No pending task proposals. Connect Gmail or upload syllabi to extract deadlines automatically.</div>
          ) : (
            <div className="dashboard-proposal-list">
              {data.ai_proposals.map((prop) => (
                <div key={prop.id} className="dashboard-proposal-item">
                  <div className="dashboard-proposal-body">
                    <div className="dashboard-proposal-title">{prop.title}</div>
                    <div className="dashboard-proposal-source">From: {prop.email_subject}</div>
                  </div>
                  <Link to="/app/inbox" className="btn btn-primary btn-sm">Review</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick Add Task Modal */}
      <Modal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        title="Quick-add academic task"
        description="Add a task with priority, category, and due date."
      >
        <form onSubmit={handleCreateQuickTask} className="dashboard-quick-form">
          <div className="dashboard-form-field">
            <label className="label" htmlFor="quickTitle">Task title *</label>
            <input
              id="quickTitle"
              required
              className="input"
              placeholder="e.g., Read CS301 Lecture 4 slides"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-field">
              <label className="label" htmlFor="quickCategory">Category</label>
              <select id="quickCategory" className="input" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>
                <option value="Assignment">Assignment</option>
                <option value="Exam Prep">Exam Prep</option>
                <option value="Project">Project</option>
                <option value="Placement">Placement</option>
                <option value="General">General</option>
              </select>
            </div>
            <div className="dashboard-form-field">
              <label className="label" htmlFor="quickPriority">Priority</label>
              <select id="quickPriority" className="input" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as any)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="dashboard-form-field">
            <label className="label" htmlFor="quickDueDate">Due date & time (optional)</label>
            <input id="quickDueDate" type="datetime-local" className="input" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
          </div>
          <div className="dashboard-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsQuickTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
