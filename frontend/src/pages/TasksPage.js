import { api } from '../api.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';
import { Modal } from '../components/index.js';
import { PriorityBadge } from '../components/index.js';
import { CategoryBadge } from '../components/index.js';

const currentTime = new Date();

export function render() {
  const container = document.createElement('div');
  container.className = 'productivity-page';

  let tasks = [];
  let isLoading = true;
  let error = null;

  let search = '';
  let statusFilter = '';
  let priorityFilter = '';
  let categoryFilter = '';
  let taskView = 'all';
  let sortOrder = 'asc';

  let isModalOpen = false;
  let editingTask = null;
  let title = '';
  let description = '';
  let category = 'Assignment';
  let priority = 'Medium';
  let status = 'Pending';
  let dueDate = '';
  let duration = '';
  let isSubmitting = false;

  let deletingTaskId = null;

  function fetchTasks() {
    isLoading = true;
    error = null;
    renderPage();
    const query = new URLSearchParams();
    if (statusFilter) query.append('status', statusFilter);
    if (priorityFilter) query.append('priority', priorityFilter);
    if (categoryFilter) query.append('category', categoryFilter);
    if (search.trim()) query.append('search', search.trim());
    query.append('sort_by', 'due_date');
    query.append('sort_order', sortOrder);

    api.listTasks(Object.fromEntries(query)).then((data) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let filtered = data;
      if (taskView === 'today') {
        filtered = data.filter((t) => {
          if (!t.due_date || t.status === 'Completed') return false;
          const d = new Date(t.due_date);
          return d >= todayStart && d <= todayEnd;
        });
      } else if (taskView === 'upcoming') {
        filtered = data.filter((t) => {
          if (!t.due_date || t.status === 'Completed') return false;
          return new Date(t.due_date) > todayEnd;
        });
      } else if (taskView === 'overdue') {
        filtered = data.filter((t) => {
          if (!t.due_date || t.status === 'Completed') return false;
          return new Date(t.due_date) < todayStart;
        });
      } else if (taskView === 'completed') {
        filtered = data.filter((t) => t.status === 'Completed');
      }
      tasks = filtered;
      isLoading = false;
      renderPage();
    }).catch((err) => {
      error = err.message || 'Failed to fetch tasks.';
      isLoading = false;
      renderPage();
    });
  }

  function openCreateModal() {
    editingTask = null;
    title = ''; description = ''; category = 'Assignment'; priority = 'Medium'; status = 'Pending'; dueDate = ''; duration = '';
    isModalOpen = true;
    renderPage();
  }

  function openEditModal(task) {
    editingTask = task;
    title = task.title;
    description = task.description || '';
    category = task.category;
    priority = task.priority;
    status = task.status;
    dueDate = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '';
    duration = task.estimated_duration ? String(task.estimated_duration) : '';
    isModalOpen = true;
    renderPage();
  }

  async function handleSaveTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    isSubmitting = true;
    renderPage();
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      status,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      estimated_duration: duration ? parseInt(duration, 10) : undefined,
    };
    try {
      if (editingTask) await api.updateTask(editingTask.id, payload);
      else await api.createTask(payload);
      isModalOpen = false;
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to save task.');
    } finally {
      isSubmitting = false;
      renderPage();
    }
  }

  async function handleToggleTask(task) {
    try {
      const updated = await api.toggleTask(task.id);
      tasks = tasks.map((t) => (t.id === task.id ? updated : t));
      renderPage();
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmDeleteTask() {
    if (!deletingTaskId) return;
    try {
      await api.deleteTask(deletingTaskId);
      tasks = tasks.filter((t) => t.id !== deletingTaskId);
      deletingTaskId = null;
      renderPage();
    } catch (err) {
      console.error(err);
    }
  }

  function renderPage() {
    container.replaceChildren();

  // Header
  const heading = document.createElement('div');
  heading.className = 'page-heading';
  const left = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Task Management';
  const desc = document.createElement('p');
  desc.className = 'page-description';
  desc.textContent = 'Track academic assignments, laboratory coursework, and examination prep.';
  left.appendChild(h1);
  left.appendChild(desc);
  const newTaskBtn = Button({ children: 'New Task', variant: 'primary', onClick: openCreateModal, icon: 'plus' });
  heading.appendChild(left);
  heading.appendChild(newTaskBtn);
  container.appendChild(heading);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'card planner-toolbar';

  const form = document.createElement('form');
  form.className = 'task-search-form';
  const searchField = document.createElement('div');
  searchField.className = 'task-search-field';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'input task-search-input';
  searchInput.placeholder = 'Search tasks';
  searchInput.value = search;
  searchInput.setAttribute('aria-label', 'Search tasks');
  const searchIcon = icon('search');
  searchIcon.className = 'task-search-icon';
  searchField.appendChild(searchInput);
  searchField.appendChild(searchIcon);
  form.appendChild(searchField);

  const filters = document.createElement('div');
  filters.className = 'task-filters';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'input task-filter-select';
  statusSelect.value = statusFilter;
  ['', 'Active', 'Pending', 'In Progress', 'Completed'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All Statuses';
    statusSelect.appendChild(opt);
  });
  statusSelect.onchange = (e) => { statusFilter = e.target.value; fetchTasks(); };

  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'input task-filter-select';
  prioritySelect.value = priorityFilter;
  ['', 'Urgent', 'High', 'Medium', 'Low'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All Priorities';
    prioritySelect.appendChild(opt);
  });
  prioritySelect.onchange = (e) => { priorityFilter = e.target.value; fetchTasks(); };

  const categorySelect = document.createElement('select');
  categorySelect.className = 'input task-filter-select';
  categorySelect.value = categoryFilter;
  ['', 'Assignment', 'Exam Prep', 'Project', 'Placement', 'General'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All Categories';
    categorySelect.appendChild(opt);
  });
  categorySelect.onchange = (e) => { categoryFilter = e.target.value; fetchTasks(); };

  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.className = 'btn btn-outline btn-sm';
  sortBtn.title = 'Toggle sort order';
  sortBtn.appendChild(icon('arrowUpDown'));
  sortBtn.appendChild(document.createTextNode(sortOrder.toUpperCase()));
  sortBtn.onclick = () => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; fetchTasks(); };

  const viewBtns = ['all', 'today', 'upcoming', 'overdue', 'completed'];
  viewBtns.forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `planner-view-btn ${taskView === v ? 'is-active' : ''}`;
    btn.setAttribute('aria-label', `${v} tasks view`);
    btn.textContent = v.charAt(0).toUpperCase() + v.slice(1);
    btn.onclick = () => { taskView = v; fetchTasks(); };
    filters.appendChild(btn);
  });

  filters.appendChild(sortBtn);
  // reorder: sort then views
  filters.insertBefore(sortBtn, filters.firstChild);

  form.appendChild(filters);
  toolbar.appendChild(form);
  container.appendChild(toolbar);

  // Content
  if (isLoading) {
    container.appendChild(LoadingSkeleton({ rows: 5, height: '70px' }));
    return container;
  }
  if (error) {
    container.appendChild(EmptyState({
      icon: icon('alertCircle'),
      title: 'Failed to load tasks',
      description: error,
      action: Button({ children: 'Retry', onClick: fetchTasks }),
    }));
    return container;
  }
  if (tasks.length === 0) {
    container.appendChild(EmptyState({
      icon: icon('checkSquare'),
      title: 'No tasks match your criteria',
      description: 'Create a new task to organize your academic coursework.',
      action: Button({ children: 'Create First Task', variant: 'primary', onClick: openCreateModal }),
    }));
    return container;
  }

  const list = document.createElement('div');
  list.className = 'planner-list';
  tasks.forEach((task) => {
    const row = document.createElement('div');
    row.className = `card card-hover task-row${task.status === 'Completed' ? ' is-completed' : ''}`;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'task-main';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.status === 'Completed';
    checkbox.className = 'task-checkbox';
    checkbox.onchange = () => handleToggleTask(task);

    const content = document.createElement('div');
    content.className = 'task-content';
    const tTitle = document.createElement('div');
    tTitle.className = 'task-title';
    tTitle.textContent = task.title;
    content.appendChild(tTitle);
    if (task.description) {
      const d = document.createElement('div');
      d.className = 'task-description';
      d.textContent = task.description;
      content.appendChild(d);
    }
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.appendChild(CategoryBadge({ category: task.category }));
    meta.appendChild(PriorityBadge({ priority: task.priority }));
    if (task.due_date) {
      const span = document.createElement('span');
      span.className = `task-due${new Date(task.due_date) < currentTime && task.status !== 'Completed' ? ' is-overdue' : ''}`;
      span.appendChild(icon('clock'));
      span.appendChild(document.createTextNode(new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })));
      meta.appendChild(span);
    }
    if (task.source_type !== 'manual') {
      const badge = document.createElement('span');
      badge.className = 'badge task-source-badge';
      badge.textContent = `From ${task.source_type}`;
      meta.appendChild(badge);
    }
    content.appendChild(meta);
    mainDiv.appendChild(checkbox);
    mainDiv.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-outline btn-icon btn-sm';
    editBtn.setAttribute('title', 'Edit task');
    editBtn.setAttribute('aria-label', `Edit ${task.title}`);
    editBtn.appendChild(icon('edit2'));
    editBtn.onclick = () => openEditModal(task);
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger btn-icon btn-sm';
    delBtn.setAttribute('title', 'Delete task');
    delBtn.setAttribute('aria-label', `Delete ${task.title}`);
    delBtn.appendChild(icon('trash2'));
    delBtn.onclick = () => { deletingTaskId = task.id; renderPage(); };
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(mainDiv);
    row.appendChild(actions);
    list.appendChild(row);
  });
  container.appendChild(list);

  // Create/Edit Modal
  if (isModalOpen) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { isModalOpen = false; renderPage(); },
      title: editingTask ? 'Edit Task' : 'Create New Academic Task',
      description: 'Provide comprehensive details for your study schedule.',
    });
    const formEl = document.createElement('form');
    formEl.className = 'task-modal-form';
    formEl.onsubmit = handleSaveTask;

    const f1 = document.createElement('div');
    const l1 = document.createElement('label');
    l1.className = 'label';
    l1.htmlFor = 'taskTitle';
    l1.textContent = 'Task Title *';
    const i1 = document.createElement('input');
    i1.id = 'taskTitle';
    i1.required = true;
    i1.className = 'input';
    i1.placeholder = 'e.g., Finalize Computer Networks Laboratory Report';
    i1.value = title;
    i1.oninput = (e) => { title = e.target.value; };
    f1.appendChild(l1);
    f1.appendChild(i1);

    const f2 = document.createElement('div');
    const l2 = document.createElement('label');
    l2.className = 'label';
    l2.htmlFor = 'taskDesc';
    l2.textContent = 'Description / Notes';
    const ta = document.createElement('textarea');
    ta.id = 'taskDesc';
    ta.rows = 3;
    ta.className = 'input';
    ta.placeholder = 'Additional guidelines, rubric, or assignment breakdown...';
    ta.value = description;
    ta.oninput = (e) => { description = e.target.value; };
    f2.appendChild(l2);
    f2.appendChild(ta);

    const grid1 = document.createElement('div');
    grid1.className = 'task-form-grid';
    const g1a = document.createElement('div');
    const l3 = document.createElement('label');
    l3.className = 'label';
    l3.htmlFor = 'taskCategory';
    l3.textContent = 'Category';
    const s1 = document.createElement('select');
    s1.id = 'taskCategory';
    s1.className = 'input';
    s1.value = category;
    s1.onchange = (e) => { category = e.target.value; };
    ['Assignment', 'Exam Prep', 'Project', 'Placement', 'General'].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      s1.appendChild(opt);
    });
    g1a.appendChild(l3);
    g1a.appendChild(s1);

    const g1b = document.createElement('div');
    const l4 = document.createElement('label');
    l4.className = 'label';
    l4.htmlFor = 'taskPriority';
    l4.textContent = 'Priority';
    const s2 = document.createElement('select');
    s2.id = 'taskPriority';
    s2.className = 'input';
    s2.value = priority;
    s2.onchange = (e) => { priority = e.target.value; };
    ['Low', 'Medium', 'High', 'Urgent'].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      s2.appendChild(opt);
    });
    g1b.appendChild(l4);
    g1b.appendChild(s2);
    grid1.appendChild(g1a);
    grid1.appendChild(g1b);

    const grid2 = document.createElement('div');
    grid2.className = 'task-form-grid';
    const g2a = document.createElement('div');
    const l5 = document.createElement('label');
    l5.className = 'label';
    l5.htmlFor = 'taskDueDate';
    l5.textContent = 'Due Date & Time';
    const i2 = document.createElement('input');
    i2.id = 'taskDueDate';
    i2.type = 'datetime-local';
    i2.className = 'input';
    i2.value = dueDate;
    i2.oninput = (e) => { dueDate = e.target.value; };
    g2a.appendChild(l5);
    g2a.appendChild(i2);

    const g2b = document.createElement('div');
    const l6 = document.createElement('label');
    l6.className = 'label';
    l6.htmlFor = 'taskDuration';
    l6.textContent = 'Estimated Duration (Minutes)';
    const i3 = document.createElement('input');
    i3.id = 'taskDuration';
    i3.type = 'number';
    i3.min = '1';
    i3.className = 'input';
    i3.placeholder = '60';
    i3.value = duration;
    i3.oninput = (e) => { duration = e.target.value; };
    g2b.appendChild(l6);
    g2b.appendChild(i3);
    grid2.appendChild(g2a);
    grid2.appendChild(g2b);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-form-actions';
    const cancelBtn = Button({ children: 'Cancel', variant: 'outline', onClick: () => { isModalOpen = false; renderPage(); } });
    const saveBtn = Button({ children: editingTask ? 'Save Changes' : 'Create Task', variant: 'primary', isLoading: isSubmitting, type: 'submit' });
    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(saveBtn);

    formEl.appendChild(f1);
    formEl.appendChild(f2);
    formEl.appendChild(grid1);
    formEl.appendChild(grid2);
    formEl.appendChild(actionsDiv);

    const dialog = modal.querySelector('.card');
    dialog.appendChild(formEl);
    container.appendChild(modal);
  }

  // Delete Confirmation Modal
  if (deletingTaskId) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { deletingTaskId = null; renderPage(); },
      title: 'Confirm Task Deletion',
      description: 'Are you sure you want to delete this task? This action cannot be undone.',
    });
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-form-actions';
    const cancelBtn = Button({ children: 'Cancel', variant: 'outline', onClick: () => { deletingTaskId = null; renderPage(); } });
    const delBtn = Button({ children: 'Delete Task', variant: 'danger', onClick: confirmDeleteTask });
    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(delBtn);
    const dialog = modal.querySelector('.card');
    dialog.appendChild(actionsDiv);
    container.appendChild(modal);
  }

  }

  renderPage();
  fetchTasks();
  return container;
}
