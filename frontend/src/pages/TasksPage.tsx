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
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
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
    <div className="productivity-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1 className="page-title">
            Task Management
          </h1>
          <p className="page-description">
            Track academic assignments, laboratory coursework, and examination prep.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={<Plus size={16} />}>
          New Task
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card planner-toolbar"
      >
        <form onSubmit={handleSearchSubmit} className="task-search-form">
          <div className="task-search-field">
              <input
                type="text"
                className="input task-search-input"
                placeholder="Search tasks"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (e.target.value) next.set('q', e.target.value);
                    else next.delete('q');
                    return next;
                  }, { replace: true });
                }}
                aria-label="Search tasks"
              />
              <Search size={16} className="task-search-icon" />
          </div>
        </form>

        <div className="task-filters">
          <select
            className="input task-filter-select"
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
            className="input task-filter-select"
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
            className="input task-filter-select"
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
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-outline btn-sm"
            title="Toggle sort order"
            aria-label={`Sort tasks ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
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
        <div className="planner-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card card-hover task-row ${task.status === 'Completed' ? 'is-completed' : ''}`}
            >
              {/* Checkbox and Title */}
              <div className="task-main">
                <input
                  type="checkbox"
                  checked={task.status === 'Completed'}
                  onChange={() => handleToggleTask(task)}
                  className="task-checkbox"
                />
                <div className="task-content">
                  <div className="task-title">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="task-description">
                      {task.description}
                    </div>
                  )}

                  {/* Metadata Tags */}
                  <div className="task-meta">
                    <CategoryBadge category={task.category} />
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && (
                      <span
                        className={`task-due ${new Date(task.due_date) < currentTime && task.status !== 'Completed' ? 'is-overdue' : ''}`}
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
                      <span className="badge task-source-badge">
                        From {task.source_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="task-actions">
                <button
                  type="button"
                  onClick={() => openEditModal(task)}
                  className="btn btn-outline btn-icon btn-sm"
                  title="Edit task"
                  aria-label={`Edit ${task.title}`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingTaskId(task.id)}
                  className="btn btn-danger btn-icon btn-sm"
                  title="Delete task"
                  aria-label={`Delete ${task.title}`}
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
        <form onSubmit={handleSaveTask} className="task-modal-form">
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

          <div className="task-form-grid">
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

          <div className="task-form-grid">
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

          <div className="task-form-actions">
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
        <div className="task-form-actions">
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
