import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Button } from '../components/common/Button';
import { PriorityBadge, CategoryBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const TasksPage: React.FC = () => {
  const [currentTime] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const sortBy = 'due_date';
  const [sortOrder, setSortOrder] = useState('asc');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Assignment');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [dueDate, setDueDate] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listTasks({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search, sortBy, sortOrder]);

  useEffect(() => {
    void Promise.resolve().then(fetchTasks);
  }, [fetchTasks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasks();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategory('Assignment');
    setPriority('Medium');
    setStatus('Pending');
    setDueDate('');
    setDuration('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '');
    setDuration(task.estimated_duration ? String(task.estimated_duration) : '');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Task> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        status,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimated_duration: duration ? parseInt(duration, 10) : undefined,
      };

      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
      } else {
        await api.createTask(payload);
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const updated = await api.toggleTask(task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      await api.deleteTask(deletingTaskId);
      setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
      setDeletingTaskId(null);
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
            Task Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Track academic assignments, laboratory coursework, and examination prep.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={<Plus size={16} />}>
          New Task
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1rem',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              className="input"
              placeholder="Search tasks by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
            <Search
              size={16}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            className="input"
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="input"
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Assignment">Assignment</option>
            <option value="Exam Prep">Exam Prep</option>
            <option value="Project">Project</option>
            <option value="Placement">Placement</option>
            <option value="General">General</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-outline btn-sm"
            title="Toggle sort order"
          >
            <ArrowUpDown size={14} />
            {sortOrder.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Task List Content */}
      {isLoading ? (
        <LoadingSkeleton rows={5} height="70px" />
      ) : error ? (
        <EmptyState
          icon={<AlertCircle size={28} />}
          title="Failed to load tasks"
          description={error}
          action={<Button onClick={fetchTasks}>Retry</Button>}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title="No tasks match your criteria"
          description="Create a new task to organize your academic coursework."
          action={<Button variant="primary" onClick={openCreateModal}>Create First Task</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="card card-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                gap: '1rem',
                opacity: task.status === 'Completed' ? 0.7 : 1,
              }}
            >
              {/* Checkbox and Title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={task.status === 'Completed'}
                  onChange={() => handleToggleTask(task)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--accent-primary)',
                    cursor: 'pointer',
                    marginTop: '3px',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: task.status === 'Completed' ? 'var(--text-muted)' : '#ffffff',
                      textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {task.description}
                    </div>
                  )}

                  {/* Metadata Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <CategoryBadge category={task.category} />
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: new Date(task.due_date) < currentTime && task.status !== 'Completed' ? '#f87171' : 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={12} />
                        {new Date(task.due_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    {task.source_type !== 'manual' && (
                      <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
                        From {task.source_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => openEditModal(task)}
                  className="btn btn-outline btn-icon btn-sm"
                  title="Edit task"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setDeletingTaskId(task.id)}
                  className="btn btn-danger btn-icon btn-sm"
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Academic Task'}
        description="Provide comprehensive details for your study schedule."
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="taskTitle">
              Task Title *
            </label>
            <input
              id="taskTitle"
              required
              className="input"
              placeholder="e.g., Finalize Computer Networks Laboratory Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="taskDesc">
              Description / Notes
            </label>
            <textarea
              id="taskDesc"
              rows={3}
              className="input"
              placeholder="Additional guidelines, rubric, or assignment breakdown..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="taskCategory">
                Category
              </label>
              <select
                id="taskCategory"
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Assignment">Assignment</option>
                <option value="Exam Prep">Exam Prep</option>
                <option value="Project">Project</option>
                <option value="Placement">Placement</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="taskPriority">
                Priority
              </label>
              <select
                id="taskPriority"
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="taskDueDate">
                Due Date & Time
              </label>
              <input
                id="taskDueDate"
                type="datetime-local"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="taskDuration">
                Estimated Duration (Minutes)
              </label>
              <input
                id="taskDuration"
                type="number"
                min="1"
                className="input"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        title="Confirm Task Deletion"
        description="Are you sure you want to delete this task? This action cannot be undone."
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="outline" onClick={() => setDeletingTaskId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteTask}>
            Delete Task
          </Button>
        </div>
      </Modal>
    </div>
  );
};
