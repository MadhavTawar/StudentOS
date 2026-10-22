import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Calendar,
  AlertCircle,
  Plus,
  Mail,
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import { DashboardOverview } from '../types';
import { Button } from '../components/common/Button';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Modal } from '../components/common/Modal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [currentDate] = useState(() => new Date());
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Task Modal
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
      const overview = await api.getDashboardOverview();
      setData(overview);
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
      // Refresh overview
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ height: '40px', width: '300px' }} className="animate-pulse-glow" />
        <LoadingSkeleton rows={4} height="90px" />
      </div>
    );
  }

  if (error || !data) {
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

  return (
    <div className="dashboard-overview" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Greeting Header */}
      <div className="dashboard-masthead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="dashboard-welcome">
          <div className="dashboard-kicker"><span /> YOUR STUDY LIFE, IN ONE PLACE</div>
          <h1 className="dashboard-title" style={{ fontSize: '1.875rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="dashboard-subtitle" style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            A little structure for everything you’re working toward.
          </p>
        </div>

        <div className="dashboard-masthead-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="dashboard-date-stamp">
            <CalendarDays size={15} />
            <span>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          <Button variant="primary" onClick={() => setIsQuickTaskOpen(true)} icon={<Plus size={16} />}>
            Quick Task
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="dashboard-stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Tasks</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {data.stats.pending + data.stats.in_progress}
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
              <CheckSquare size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
            {data.stats.completed} completed overall
          </div>
        </div>

        <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--accent-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Upcoming Deadlines</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {data.upcoming_deadlines.length}
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
            Next 7 academic days
          </div>
        </div>

        <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overdue Tasks</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: data.stats.overdue > 0 ? '#f87171' : '#ffffff', marginTop: '0.25rem' }}>
                {data.stats.overdue}
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem' }}>
            Requires immediate focus
          </div>
        </div>

        <div className="card dashboard-stat" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Integration Status</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', marginTop: '0.5rem' }}>
                {data.gmail_connected ? 'Gmail Connected' : 'Gmail Disconnected'}
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
              <Mail size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            {data.gmail_connected ? data.gmail_email : 'Click to connect inbox'}
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Tasks & Upcoming Deadlines */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>What deserves attention next</h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 1.65rem' }}>
              Based on due dates and task priority. It does not assume how much free time you have.
            </p>
          </div>
          <Link to="/app/planner" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Open planner →</Link>
        </div>
        {data.daily_priorities.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="Your plan is clear"
            description="Add a task or deadline when you know what you want to work on next."
            action={<Button variant="outline" onClick={() => setIsQuickTaskOpen(true)} icon={<Plus size={15} />}>Add a task</Button>}
          />
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {data.daily_priorities.map(({ task, reason }) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0.8rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{reason}{task.due_date ? ` · ${new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</div>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Pending Tasks & Upcoming Deadlines */}
      <div className="dashboard-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Pending Tasks Section */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>Active Tasks</h2>
            </div>
            <Link to="/app/tasks" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View all &rarr;
            </Link>
          </div>

          {data.pending_tasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title="No active tasks"
              description="You're all caught up! Use quick-add to schedule new study tasks."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {data.pending_tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={() => handleToggleTask(task.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines Section */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={18} color="var(--accent-secondary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>Upcoming Deadlines</h2>
            </div>
            <Link to="/app/deadlines" style={{ fontSize: '0.8125rem', color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600 }}>
              View all &rarr;
            </Link>
          </div>

          {data.upcoming_deadlines.length === 0 ? (
            <EmptyState
              icon={<Calendar size={24} />}
              title="No upcoming deadlines"
              description="No assignments or examinations recorded for the upcoming week."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {data.upcoming_deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>{deadline.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(deadline.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <StatusBadge status={deadline.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Proposals & Recent Emails Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* AI Proposals Review Alert */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(19, 27, 46, 1) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>AI Proposals Waiting for Approval</h2>
            </div>
            <Link to="/app/inbox" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Review inbox &rarr;
            </Link>
          </div>

          {data.ai_proposals.length === 0 ? (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
              No pending task proposals. Connect your Gmail or upload syllabi to extract deadlines automatically.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.ai_proposals.map((prop) => (
                <div
                  key={prop.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>{prop.title}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>From: {prop.email_subject}</div>
                  </div>
                  <Link to="/app/inbox" className="btn btn-primary btn-sm">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Gmail Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} color="var(--text-muted)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>Recent Academic Emails</h2>
            </div>
            <Link to="/app/inbox" style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Open inbox &rarr;
            </Link>
          </div>

          {!data.gmail_connected ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Connect Gmail with read-only permissions to automatically detect assignments and deadlines.
              </p>
              <Link to="/app/inbox" className="btn btn-secondary btn-sm">
                Connect Gmail
              </Link>
            </div>
          ) : data.recent_emails.length === 0 ? (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
              No messages synced yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.recent_emails.slice(0, 3).map((email) => (
                <div
                  key={email.id}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Task Modal */}
      <Modal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        title="Quick-Add Academic Task"
        description="Add a task with priority, category, and due date."
      >
        <form onSubmit={handleCreateQuickTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="quickTitle">
              Task Title *
            </label>
            <input
              id="quickTitle"
              required
              className="input"
              placeholder="e.g., Read CS301 Lecture 4 slides"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="quickCategory">
                Category
              </label>
              <select
                id="quickCategory"
                className="input"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
              >
                <option value="Assignment">Assignment</option>
                <option value="Exam Prep">Exam Prep</option>
                <option value="Project">Project</option>
                <option value="Placement">Placement</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="quickPriority">
                Priority
              </label>
              <select
                id="quickPriority"
                className="input"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="quickDueDate">
              Due Date & Time (Optional)
            </label>
            <input
              id="quickDueDate"
              type="datetime-local"
              className="input"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsQuickTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
