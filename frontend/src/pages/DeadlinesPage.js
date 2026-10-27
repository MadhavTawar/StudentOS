import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';
import { Modal } from '../components/index.js';
import { StatusBadge } from '../components/index.js';

const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function render() {
  const container = document.createElement('div');
  container.className = 'productivity-page planner-page';

  let deadlines = [];
  let tasks = [];
  let isLoading = true;
  let error = null;

  let eventTypeFilter = '';
  let statusFilter = '';
  let viewMode = 'month';
  let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = new Date();
  const todayKey = localDateKey(new Date());

  let isModalOpen = false;
  let editingDeadline = null;
  let title = '';
  let description = '';
  let eventType = 'Assignment';
  let dueDate = '';
  let taskId = '';
  let isAmbiguous = false;
  let originalDateText = '';
  let isSubmitting = false;
  let duplicateWarning = null;
  let deletingId = null;

  let aiGenerating = false;
  let aiProposal = null;

  function fetchPlanner() {
    isLoading = true;
    error = null;
    render();
    const q1 = new URLSearchParams();
    if (eventTypeFilter) q1.append('event_type', eventTypeFilter);
    if (statusFilter) q1.append('status', statusFilter);
    Promise.all([api.listDeadlines(Object.fromEntries(q1)), api.listTasks({})])
      .then(([dList, tList]) => {
        deadlines = dList;
        tasks = tList;
        isLoading = false;
        render();
      })
      .catch((err) => {
        error = err.message || 'Failed to load planner.';
        isLoading = false;
        render();
      });
  }

  function openCreateModal() {
    editingDeadline = null;
    title = ''; description = ''; eventType = 'Assignment'; dueDate = ''; taskId = '';
    isAmbiguous = false; originalDateText = ''; duplicateWarning = null;
    isModalOpen = true;
    render();
  }

  function openEditModal(d) {
    editingDeadline = d;
    title = d.title; description = d.description || ''; eventType = d.event_type;
    dueDate = new Date(d.due_date).toISOString().slice(0, 16);
    taskId = d.task_id || '';
    isAmbiguous = d.is_ambiguous;
    originalDateText = d.original_date_text || '';
    duplicateWarning = null;
    isModalOpen = true;
    render();
  }

  async function handleTitleOrDateChange(newTitle, newDueDate) {
    if (newTitle.trim().length > 3 && newDueDate && !editingDeadline) {
      try {
        const check = await api.checkDeadlineDuplicate({ title: newTitle.trim(), due_date: new Date(newDueDate).toISOString() });
        duplicateWarning = check.is_duplicate ? (check.message || 'Possible duplicate deadline found.') : null;
      } catch { /* ignore */ }
      render();
    }
  }

  async function handleSaveDeadline(e) {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    isSubmitting = true;
    render();
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      event_type: eventType,
      due_date: new Date(dueDate).toISOString(),
      task_id: taskId || undefined,
      is_ambiguous: isAmbiguous,
      original_date_text: isAmbiguous ? originalDateText : undefined,
    };
    try {
      if (editingDeadline) await api.updateDeadline(editingDeadline.id, payload);
      else await api.createDeadline(payload);
      isModalOpen = false;
      await fetchPlanner();
    } catch (err) {
      alert(err.message || 'Failed to save deadline.');
    } finally {
      isSubmitting = false;
      render();
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      await api.deleteDeadline(deletingId);
      deadlines = deadlines.filter((d) => d.id !== deletingId);
      deletingId = null;
      render();
    } catch (err) {
      alert(err.message || 'Failed to delete deadline.');
    }
  }

  function buildCalendarCells() {
    const cells = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - calendarMonth.getDay() + i));
    }
    return cells;
  }

  const tasksByDay = new Map();
  const deadlinesByDay = new Map();
  tasks.forEach((t) => {
    if (t.due_date) {
      const key = localDateKey(new Date(t.due_date));
      (tasksByDay.get(key) || []).push(t);
      tasksByDay.set(key, tasksByDay.get(key));
    }
  });
  deadlines.forEach((d) => {
    const key = localDateKey(new Date(d.due_date));
    (deadlinesByDay.get(key) || []).push(d);
    deadlinesByDay.set(key, deadlinesByDay.get(key));
  });

  const selectedDateKey = localDateKey(selectedDate);
  const selectedTasks = tasks.filter((t) => t.due_date && localDateKey(new Date(t.due_date)) === selectedDateKey);
  const selectedDeadlines = deadlines.filter((d) => localDateKey(new Date(d.due_date)) === selectedDateKey);
  const selectedItems = [...selectedTasks, ...selectedDeadlines];
  const selectedCompleted = selectedTasks.filter((t) => t.status === 'Completed').length;
  const selectedPercent = selectedItems.length ? Math.round((selectedCompleted / selectedItems.length) * 100) : 0;

  async function handleGeneratePlan() {
    aiGenerating = true;
    aiProposal = null;
    render();
    try {
      const dateLabel = selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      const response = await api.chatAssistant(`Generate a study plan for ${dateLabel}. Suggest 3-5 concrete study tasks with titles, short descriptions, and suggested due times. Keep each task specific and achievable.`);
      aiProposal = response.reply;
    } catch (err) {
      aiProposal = `I couldn't generate a study plan right now. ${err instanceof Error ? err.message : 'Please try again later.'}`;
    } finally {
      aiGenerating = false;
      render();
    }
  }

  async function handleConfirmPlan() {
    if (!aiProposal) return;
    aiGenerating = true;
    render();
    try {
      const lines = aiProposal.split(/\n+/).filter((line) => line.trim().length > 0);
      for (const line of lines) {
        const clean = line.replace(/^[-•*\d.\s]+/, '').trim();
        if (clean.length < 3) continue;
        await api.createTask({ title: clean, category: 'Study Plan', priority: 'Medium', due_date: selectedDate.toISOString() });
      }
      aiProposal = null;
      await fetchPlanner();
    } catch (err) {
      alert(err.message || 'Failed to create study plan tasks.');
    } finally {
      aiGenerating = false;
      render();
    }
  }

  // Header
  const heading = document.createElement('div');
  heading.className = 'page-heading';
  const left = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Academic Planner';
  const desc = document.createElement('p');
  desc.className = 'page-description';
  desc.textContent = 'Calendar view of your tasks and deadlines. Select a day to see what\'s due.';
  left.appendChild(h1);
  left.appendChild(desc);
  const newDeadlineBtn = Button({ children: 'New Deadline', variant: 'primary', onClick: openCreateModal, icon: 'plus' });
  heading.appendChild(left);
  heading.appendChild(newDeadlineBtn);
  container.appendChild(heading);

  // Filter bar
  const toolbar = document.createElement('div');
  toolbar.className = 'card planner-toolbar deadline-filters';

  const etSelect = document.createElement('select');
  etSelect.className = 'input';
  etSelect.value = eventTypeFilter;
  ['', 'Assignment', 'Examination', 'Placement', 'Interview', 'Project', 'Registration'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All Event Types';
    etSelect.appendChild(opt);
  });
  etSelect.onchange = (e) => { eventTypeFilter = e.target.value; fetchPlanner(); };

  const stSelect = document.createElement('select');
  stSelect.className = 'input';
  stSelect.value = statusFilter;
  ['', 'Upcoming', 'Due Soon', 'Completed', 'Overdue'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || 'All Statuses';
    stSelect.appendChild(opt);
  });
  stSelect.onchange = (e) => { statusFilter = e.target.value; fetchPlanner(); };

  const toggle = document.createElement('div');
  toggle.className = 'planner-view-toggle';
  ['month', 'week', 'day'].forEach((vm) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `planner-view-btn ${viewMode === vm ? 'is-active' : ''}`;
    btn.setAttribute('aria-label', `${vm} view`);
    btn.textContent = vm.charAt(0).toUpperCase() + vm.slice(1);
    btn.onclick = () => { viewMode = vm; render(); };
    toggle.appendChild(btn);
  });
  const todayBtn = document.createElement('button');
  todayBtn.type = 'button';
  todayBtn.className = 'btn btn-outline btn-sm';
  todayBtn.textContent = 'Today';
  todayBtn.onclick = () => {
    calendarMonth = new Date();
    selectedDate = new Date();
    viewMode = 'day';
    render();
  };
  toggle.appendChild(todayBtn);

  toolbar.appendChild(etSelect);
  toolbar.appendChild(stSelect);
  toolbar.appendChild(toggle);
  container.appendChild(toolbar);

  // Calendar section
  const section = document.createElement('section');
  section.className = 'planner-calendar-layout';
  section.setAttribute('aria-label', 'Monthly study calendar');

  const calCard = document.createElement('div');
  calCard.className = 'card planner-calendar-card';
  const calHeader = document.createElement('div');
  calHeader.className = 'planner-calendar-header';
  const calLeft = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'planner-calendar-eyebrow';
  eyebrow.textContent = 'YOUR SCHEDULE';
  const h2 = document.createElement('h2');
  h2.textContent = calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
  calLeft.appendChild(eyebrow);
  calLeft.appendChild(h2);
  const calControls = document.createElement('div');
  calControls.className = 'planner-calendar-controls';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.setAttribute('aria-label', 'Previous month');
  prevBtn.appendChild(icon('chevronLeft'));
  prevBtn.onclick = () => {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    calendarMonth = next;
    if (selectedDate.getMonth() !== next.getMonth() || selectedDate.getFullYear() !== next.getFullYear()) selectedDate = next;
    render();
  };
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.setAttribute('aria-label', 'Next month');
  nextBtn.appendChild(icon('chevronRight'));
  nextBtn.onclick = () => {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    calendarMonth = next;
    if (selectedDate.getMonth() !== next.getMonth() || selectedDate.getFullYear() !== next.getFullYear()) selectedDate = next;
    render();
  };
  calControls.appendChild(prevBtn);
  calControls.appendChild(nextBtn);
  calHeader.appendChild(calLeft);
  calHeader.appendChild(calControls);
  calCard.appendChild(calHeader);

  const calGrid = document.createElement('div');
  calGrid.className = 'planner-calendar-grid';
  calGrid.setAttribute('role', 'group');
  calGrid.setAttribute('aria-label', 'Select a date');

  if (viewMode === 'day') {
    const dayView = document.createElement('div');
    dayView.className = 'planner-calendar-day-view';
    const weekday = document.createElement('span');
    weekday.className = 'planner-calendar-weekday';
    weekday.setAttribute('aria-hidden', 'true');
    weekday.textContent = selectedDate.toLocaleDateString([], { weekday: 'long' });
    const dayBtn = document.createElement('div');
    dayBtn.className = 'planner-calendar-day pl-selector-day is-selected';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = selectedDate.getDate();
    const count = document.createElement('span');
    count.className = 'planner-calendar-count';
    count.textContent = selectedItems.length;
    dayBtn.appendChild(dateSpan);
    dayBtn.appendChild(count);
    dayView.appendChild(weekday);
    dayView.appendChild(dayBtn);
    calGrid.appendChild(dayView);
  } else {
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
      const span = document.createElement('span');
      span.className = 'planner-calendar-weekday';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = day;
      calGrid.appendChild(span);
    });
    buildCalendarCells().forEach((day) => {
      const key = localDateKey(day);
      const dayTasks = tasksByDay.get(key) || [];
      const dayDeadlines = deadlinesByDay.get(key) || [];
      const hasEvents = dayTasks.length + dayDeadlines.length > 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `planner-calendar-day${day.getMonth() === calendarMonth.getMonth() ? '' : ' is-outside'}${key === todayKey ? ' is-today' : ''}${key === selectedDateKey ? ' is-selected' : ''}${hasEvents ? ' has-events' : ''}`;
      btn.setAttribute('aria-label', `${day.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}${hasEvents ? `, ${dayTasks.length + dayDeadlines.length} scheduled items` : ''}`);
      btn.setAttribute('aria-pressed', key === selectedDateKey);
      const dateSpan = document.createElement('span');
      dateSpan.textContent = day.getDate();
      btn.appendChild(dateSpan);
      if (hasEvents) {
        const count = document.createElement('span');
        count.className = 'planner-calendar-count';
        count.textContent = dayTasks.length + dayDeadlines.length;
        btn.appendChild(count);
      }
      const pctBar = document.createElement('span');
      pctBar.className = 'planner-percent-bar';
      const fill = document.createElement('span');
      fill.className = 'planner-percent-fill';
      const dayTasksMap = tasksByDay.get(key) || [];
      if (dayTasksMap.length > 0) {
        const completed = dayTasksMap.filter((t) => t.status === 'Completed').length;
        fill.style.width = `${Math.round((completed / dayTasksMap.length) * 100)}%`;
      }
      pctBar.appendChild(fill);
      btn.appendChild(pctBar);
      btn.onclick = () => {
        selectedDate = day;
        if (day.getMonth() !== calendarMonth.getMonth()) calendarMonth = new Date(day.getFullYear(), day.getMonth(), 1);
        render();
      };
      calGrid.appendChild(btn);
    });
  }
  calCard.appendChild(calGrid);

  const selectedDay = document.createElement('div');
  selectedDay.className = 'planner-selected-day';
  const selectedHeading = document.createElement('div');
  selectedHeading.className = 'planner-selected-day-heading';
  const selLeft = document.createElement('div');
  const selEyebrow = document.createElement('span');
  selEyebrow.className = 'planner-calendar-eyebrow';
  selEyebrow.textContent = 'SELECTED DAY';
  const selH3 = document.createElement('h3');
  selH3.textContent = selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  selLeft.appendChild(selEyebrow);
  selLeft.appendChild(selH3);
  const selDeadlineBtn = Button({ children: 'Deadline', variant: 'outline', onClick: openCreateModal, icon: 'plus' });
  selectedHeading.appendChild(selLeft);
  selectedHeading.appendChild(selDeadlineBtn);
  selectedDay.appendChild(selectedHeading);

  const progress = document.createElement('div');
  progress.className = 'planner-day-progress';
  const progressLabel = document.createElement('span');
  progressLabel.className = 'planner-day-progress-label';
  progressLabel.textContent = `Tasks for ${selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const track = document.createElement('div');
  track.className = 'planner-day-progress-track';
  const fill = document.createElement('div');
  fill.className = 'planner-day-progress-fill';
  fill.style.width = `${selectedPercent}%`;
  const pctText = document.createElement('span');
  pctText.className = 'planner-day-progress-text';
  pctText.textContent = `${selectedPercent}% complete`;
  track.appendChild(fill);
  progress.appendChild(progressLabel);
  progress.appendChild(track);
  progress.appendChild(pctText);
  selectedDay.appendChild(progress);

  if (selectedItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'planner-selected-day-empty';
    empty.textContent = isLoading ? 'Loading tasks and deadlines…' : (error ? 'Schedule items could not be loaded.' : 'No tasks or deadlines are scheduled for this date.');
    selectedDay.appendChild(empty);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'planner-selected-events';
    selectedTasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'planner-event-row';
      const label = document.createElement('label');
      label.className = 'planner-event-task';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.status === 'Completed';
      checkbox.setAttribute('aria-label', `Complete ${task.title}`);
      checkbox.className = 'planner-checkbox';
      checkbox.onchange = async () => {
        try {
          const updated = await api.toggleTask(task.id);
          tasks = tasks.map((t) => (t.id === updated.id ? updated : t));
          render();
        } catch (e) {
          error = e instanceof Error ? e.message : 'Could not update task.';
          render();
        }
      };
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = task.title;
      span.appendChild(strong);
      if (task.description) {
        const d = document.createElement('span');
        d.className = 'planner-event-description';
        d.textContent = task.description;
        span.appendChild(d);
      }
      if (task.estimated_duration) {
        const chip = document.createElement('span');
        chip.className = 'planner-duration-chip';
        chip.textContent = `${task.estimated_duration} min`;
        span.appendChild(chip);
      }
      label.appendChild(checkbox);
      label.appendChild(span);
      const editLink = document.createElement('a');
      editLink.className = 'planner-event-edit';
      editLink.href = `/app/tasks/${task.id}`;
      editLink.setAttribute('title', 'Edit task');
      editLink.appendChild(icon('edit2'));
      editLink.onclick = (e) => { e.preventDefault(); router.navigate(`/app/tasks/${task.id}`); };
      li.appendChild(label);
      li.appendChild(editLink);
      ul.appendChild(li);
    });
    selectedDeadlines.forEach((deadline) => {
      const li = document.createElement('li');
      li.className = 'planner-event-row planner-event-row-deadline';
      const mark = document.createElement('span');
      mark.className = 'planner-event-deadline-mark';
      const copy = document.createElement('span');
      copy.className = 'planner-event-copy';
      const strong = document.createElement('strong');
      strong.textContent = deadline.title;
      copy.appendChild(strong);
      if (deadline.description) {
        const d = document.createElement('span');
        d.className = 'planner-event-description';
        d.textContent = deadline.description;
        copy.appendChild(d);
      }
      const small = document.createElement('small');
      small.textContent = `Deadline · ${new Date(deadline.due_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      copy.appendChild(small);
      li.appendChild(mark);
      li.appendChild(copy);
      li.appendChild(StatusBadge({ status: deadline.status }));
      const actions = document.createElement('div');
      actions.className = 'planner-event-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-outline btn-icon btn-sm';
      editBtn.setAttribute('title', 'Edit deadline');
      editBtn.appendChild(icon('edit2'));
      editBtn.onclick = () => openEditModal(deadline);
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-icon btn-sm';
      delBtn.setAttribute('title', 'Delete deadline');
      delBtn.appendChild(icon('trash2'));
      delBtn.onclick = () => { deletingId = deadline.id; render(); };
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    selectedDay.appendChild(ul);
  }
  calCard.appendChild(selectedDay);
  section.appendChild(calCard);

  // Context column
  const contextCol = document.createElement('aside');
  contextCol.className = 'planner-context-column';
  contextCol.setAttribute('aria-label', 'Study context and quick actions');

  const streakCard = document.createElement('section');
  streakCard.className = 'card planner-context-card planner-context-card-streak';
  const streakIcon = document.createElement('span');
  streakIcon.className = 'planner-context-icon planner-context-icon-streak';
  streakIcon.appendChild(icon('calendarDays'));
  const streakDiv = document.createElement('div');
  const streakEyebrow = document.createElement('span');
  streakEyebrow.className = 'planner-calendar-eyebrow';
  streakEyebrow.textContent = 'STUDY STREAK';
  const streakStrong = document.createElement('strong');
  streakStrong.textContent = '0';
  const streakP = document.createElement('p');
  streakP.textContent = 'day with a completed task';
  streakDiv.appendChild(streakEyebrow);
  streakDiv.appendChild(streakStrong);
  streakDiv.appendChild(streakP);
  streakCard.appendChild(streakIcon);
  streakCard.appendChild(streakDiv);
  contextCol.appendChild(streakCard);

  const activeCard = document.createElement('section');
  activeCard.className = 'card planner-context-card planner-context-card-upcoming';
  const activeIcon = document.createElement('span');
  activeIcon.className = 'planner-context-icon planner-context-icon-upcoming';
  activeIcon.appendChild(icon('checkSquare'));
  const activeDiv = document.createElement('div');
  const activeEyebrow = document.createElement('span');
  activeEyebrow.className = 'planner-calendar-eyebrow';
  activeEyebrow.textContent = 'ACTIVE WORK';
  const activeStrong = document.createElement('strong');
  activeStrong.textContent = tasks.filter((t) => t.status !== 'Completed').length;
  const activeP = document.createElement('p');
  activeP.textContent = 'Tasks that still need attention';
  activeDiv.appendChild(activeEyebrow);
  activeDiv.appendChild(activeStrong);
  activeDiv.appendChild(activeP);
  const activeLink = document.createElement('a');
  activeLink.href = '/app/planner?view=tasks';
  activeLink.setAttribute('aria-label', 'View all tasks');
  activeLink.textContent = 'View tasks ';
  activeLink.appendChild(icon('arrowRight'));
  activeLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/planner?view=tasks'); };
  activeCard.appendChild(activeIcon);
  activeCard.appendChild(activeDiv);
  activeCard.appendChild(activeLink);
  contextCol.appendChild(activeCard);

  const aiCard = document.createElement('section');
  aiCard.className = 'card planner-context-card planner-context-card-ai';
  const aiIcon = document.createElement('span');
  aiIcon.className = 'planner-context-icon planner-context-icon-ai';
  aiIcon.appendChild(icon('bot'));
  const aiDiv = document.createElement('div');
  const aiEyebrow = document.createElement('span');
  aiEyebrow.className = 'planner-calendar-eyebrow';
  aiEyebrow.textContent = 'AI STUDY ASSISTANT';
  const aiStrong = document.createElement('strong');
  aiStrong.textContent = 'Generate study plan';
  const aiP = document.createElement('p');
  aiP.textContent = 'Create tasks for the selected date you must confirm first.';
  aiDiv.appendChild(aiEyebrow);
  aiDiv.appendChild(aiStrong);
  aiDiv.appendChild(aiP);
  const aiBtn = document.createElement('button');
  aiBtn.type = 'button';
  aiBtn.className = 'btn btn-outline btn-sm planner-ai-generate';
  aiBtn.disabled = aiGenerating;
  aiBtn.onclick = handleGeneratePlan;
  aiBtn.appendChild(aiGenerating ? icon('refreshCw') : icon('arrowRight'));
  aiBtn.appendChild(document.createTextNode(' Generate'));
  aiCard.appendChild(aiIcon);
  aiCard.appendChild(aiDiv);
  aiCard.appendChild(aiBtn);
  contextCol.appendChild(aiCard);

  const quickCard = document.createElement('section');
  quickCard.className = 'card planner-context-card planner-context-card-quick';
  const quickIcon = document.createElement('span');
  quickIcon.className = 'planner-context-icon planner-context-icon-quick';
  quickIcon.appendChild(icon('plus'));
  const quickDiv = document.createElement('div');
  const quickEyebrow = document.createElement('span');
  quickEyebrow.className = 'planner-calendar-eyebrow';
  quickEyebrow.textContent = 'QUICK ACTIONS';
  const quickStrong = document.createElement('strong');
  quickStrong.textContent = `Add task for ${selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
  const quickP = document.createElement('p');
  quickP.textContent = 'Create a new task on the selected date.';
  quickDiv.appendChild(quickEyebrow);
  quickDiv.appendChild(quickStrong);
  quickDiv.appendChild(quickP);
  const quickBtn = Button({ children: 'Add task', variant: 'primary', onClick: openCreateModal, icon: 'plus', className: 'planner-quick-add' });
  quickCard.appendChild(quickIcon);
  quickCard.appendChild(quickDiv);
  quickCard.appendChild(quickBtn);
  contextCol.appendChild(quickCard);

  if (aiProposal) {
    const proposalCard = document.createElement('section');
    proposalCard.className = 'card planner-context-card planner-context-card-proposal';
    const propHeader = document.createElement('div');
    propHeader.className = 'planner-proposal-header';
    const propIcon = document.createElement('span');
    propIcon.className = 'planner-context-icon planner-context-icon-proposal';
    propIcon.appendChild(icon('bot'));
    const propDiv = document.createElement('div');
    const propEyebrow = document.createElement('span');
    propEyebrow.className = 'planner-calendar-eyebrow';
    propEyebrow.textContent = 'PROPOSED STUDY PLAN';
    const propStrong = document.createElement('strong');
    propStrong.textContent = 'Confirm before creating tasks';
    propDiv.appendChild(propEyebrow);
    propDiv.appendChild(propStrong);
    propHeader.appendChild(propIcon);
    propHeader.appendChild(propDiv);
    const propBody = document.createElement('div');
    propBody.className = 'planner-proposal-body';
    propBody.textContent = aiProposal;
    const propActions = document.createElement('div');
    propActions.className = 'planner-proposal-actions';
    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'btn btn-outline btn-sm';
    rejectBtn.textContent = 'Reject';
    rejectBtn.onclick = () => { aiProposal = null; render(); };
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-primary btn-sm';
    confirmBtn.disabled = aiGenerating;
    confirmBtn.appendChild(aiGenerating ? icon('refreshCw') : icon('arrowRight'));
    confirmBtn.appendChild(document.createTextNode(' Confirm & create tasks'));
    confirmBtn.onclick = handleConfirmPlan;
    propActions.appendChild(rejectBtn);
    propActions.appendChild(confirmBtn);
    proposalCard.appendChild(propHeader);
    proposalCard.appendChild(propBody);
    proposalCard.appendChild(propActions);
    contextCol.appendChild(proposalCard);
  }

  section.appendChild(calCard);
  section.appendChild(contextCol);
  container.appendChild(section);

  // Deadlines list
  if (isLoading) {
    container.appendChild(LoadingSkeleton({ rows: 5, height: '75px' }));
  } else if (error) {
    container.appendChild(EmptyState({
      icon: icon('alertCircle'),
      title: 'Could not load deadlines',
      description: error,
      action: Button({ children: 'Retry', onClick: fetchPlanner }),
    }));
  } else if (deadlines.length === 0) {
    container.appendChild(EmptyState({
      icon: icon('calendarDays'),
      title: 'No deadlines recorded',
      description: 'Schedule upcoming examination dates or assignment due dates to receive automated reminders.',
      action: Button({ children: 'Add First Deadline', variant: 'primary', onClick: openCreateModal }),
    }));
  } else {
    const list = document.createElement('div');
    list.className = 'planner-list';
    deadlines.forEach((deadline) => {
      const isOverdue = deadline.status === 'Overdue';
      const isDueSoon = deadline.status === 'Due Soon';
      const row = document.createElement('div');
      row.className = `card card-hover deadline-row${isOverdue ? ' is-overdue' : isDueSoon ? ' is-due-soon' : ''}`;
      const content = document.createElement('div');
      content.className = 'deadline-content';
      const titleRow = document.createElement('div');
      titleRow.className = 'deadline-title-row';
      const dTitle = document.createElement('span');
      dTitle.className = 'deadline-title';
      dTitle.textContent = deadline.title;
      titleRow.appendChild(dTitle);
      if (deadline.is_ambiguous) {
        const badge = document.createElement('span');
        badge.title = `Ambiguous date extracted: "${deadline.original_date_text || 'relative text'}". Requires confirmation.`;
        badge.className = 'badge deadline-ambiguous';
        badge.appendChild(icon('helpCircle'));
        badge.appendChild(document.createTextNode(' Ambiguous Date'));
        titleRow.appendChild(badge);
      }
      content.appendChild(titleRow);
      if (deadline.description) {
        const d = document.createElement('div');
        d.className = 'deadline-description';
        d.textContent = deadline.description;
        content.appendChild(d);
      }
      const meta = document.createElement('div');
      meta.className = 'deadline-meta';
      const dateSpan = document.createElement('span');
      dateSpan.className = `deadline-date${isOverdue ? ' is-overdue' : ''}`;
      dateSpan.appendChild(icon('clock'));
      dateSpan.appendChild(document.createTextNode(new Date(deadline.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })));
      meta.appendChild(dateSpan);
      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge deadline-type';
      typeBadge.textContent = deadline.event_type;
      meta.appendChild(typeBadge);
      meta.appendChild(StatusBadge({ status: deadline.status }));
      content.appendChild(meta);
      row.appendChild(content);

      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-outline btn-icon btn-sm';
      editBtn.setAttribute('title', 'Edit deadline');
      editBtn.appendChild(icon('edit2'));
      editBtn.onclick = () => openEditModal(deadline);
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-icon btn-sm';
      delBtn.setAttribute('title', 'Delete deadline');
      delBtn.appendChild(icon('trash2'));
      delBtn.onclick = () => { deletingId = deadline.id; render(); };
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      row.appendChild(actions);
      list.appendChild(row);
    });
    container.appendChild(list);
  }

  // Create/Edit Modal
  if (isModalOpen) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { isModalOpen = false; render(); },
      title: editingDeadline ? 'Edit Academic Deadline' : 'Schedule Academic Deadline',
      description: 'Preserve exact due dates and event metadata.',
      maxWidth: 'max-w-2xl',
    });
    const formEl = document.createElement('form');
    formEl.className = 'planner-deadline-form';
    formEl.onsubmit = handleSaveDeadline;

    if (duplicateWarning) {
      const warn = document.createElement('div');
      warn.className = 'planner-duplicate-warning';
      warn.appendChild(icon('alertTriangle'));
      const span = document.createElement('span');
      span.textContent = duplicateWarning;
      warn.appendChild(span);
      formEl.appendChild(warn);
    }

    const f1 = document.createElement('div');
    f1.className = 'planner-form-field';
    const l1 = document.createElement('label');
    l1.className = 'label';
    l1.htmlFor = 'deadlineTitle';
    l1.textContent = 'Event / Assignment Title *';
    const i1 = document.createElement('input');
    i1.id = 'deadlineTitle';
    i1.required = true;
    i1.className = 'input';
    i1.placeholder = 'e.g., Operating Systems Midterm Examination';
    i1.value = title;
    i1.oninput = (e) => { title = e.target.value; handleTitleOrDateChange(e.target.value, dueDate); };
    f1.appendChild(l1);
    f1.appendChild(i1);

    const row = document.createElement('div');
    row.className = 'planner-form-row';
    const f2 = document.createElement('div');
    f2.className = 'planner-form-field';
    const l2 = document.createElement('label');
    l2.className = 'label';
    l2.htmlFor = 'eventType';
    l2.textContent = 'Event Type';
    const s1 = document.createElement('select');
    s1.id = 'eventType';
    s1.className = 'input';
    s1.value = eventType;
    s1.onchange = (e) => { eventType = e.target.value; };
    ['Assignment', 'Examination', 'Placement', 'Interview', 'Project', 'Registration', 'Other'].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      s1.appendChild(opt);
    });
    f2.appendChild(l2);
    f2.appendChild(s1);

    const f3 = document.createElement('div');
    f3.className = 'planner-form-field';
    const l3 = document.createElement('label');
    l3.className = 'label';
    l3.htmlFor = 'deadlineDate';
    l3.textContent = 'Due Date & Time *';
    const i2 = document.createElement('input');
    i2.id = 'deadlineDate';
    i2.type = 'datetime-local';
    i2.required = true;
    i2.className = 'input';
    i2.value = dueDate;
    i2.oninput = (e) => { dueDate = e.target.value; handleTitleOrDateChange(title, e.target.value); };
    f3.appendChild(l3);
    f3.appendChild(i2);
    row.appendChild(f2);
    row.appendChild(f3);

    const f4 = document.createElement('div');
    f4.className = 'planner-form-field';
    const l4 = document.createElement('label');
    l4.className = 'label';
    l4.htmlFor = 'linkedTask';
    l4.textContent = 'Associate with Existing Task (Optional)';
    const s2 = document.createElement('select');
    s2.id = 'linkedTask';
    s2.className = 'input';
    s2.value = taskId;
    s2.onchange = (e) => { taskId = e.target.value; };
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = 'None (Independent Deadline)';
    s2.appendChild(optNone);
    tasks.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.title} (${t.priority})`;
      s2.appendChild(opt);
    });
    f4.appendChild(l4);
    f4.appendChild(s2);

    const f5 = document.createElement('div');
    f5.className = 'planner-form-field';
    const l5 = document.createElement('label');
    l5.className = 'label';
    l5.htmlFor = 'deadlineDesc';
    l5.textContent = 'Description / Location / Rules';
    const ta = document.createElement('textarea');
    ta.id = 'deadlineDesc';
    ta.rows = 2;
    ta.className = 'input';
    ta.placeholder = 'e.g., Hall B, closed-book exam, bring student ID card.';
    ta.value = description;
    ta.oninput = (e) => { description = e.target.value; };
    f5.appendChild(l5);
    f5.appendChild(ta);

    const f6 = document.createElement('div');
    f6.className = 'planner-ambiguous-row';
    const cb = document.createElement('input');
    cb.id = 'ambiguousCheck';
    cb.type = 'checkbox';
    cb.checked = isAmbiguous;
    cb.className = 'planner-checkbox';
    cb.onchange = (e) => { isAmbiguous = e.target.checked; };
    const lbl = document.createElement('label');
    lbl.htmlFor = 'ambiguousCheck';
    lbl.className = 'planner-ambiguous-label';
    lbl.textContent = 'Mark date as ambiguous (e.g. extracted from "next Friday" or approximate schedule)';
    f6.appendChild(cb);
    f6.appendChild(lbl);

    let f7 = null;
    if (isAmbiguous) {
      f7 = document.createElement('div');
      f7.className = 'planner-form-field';
      const l7 = document.createElement('label');
      l7.className = 'label';
      l7.htmlFor = 'originalDateText';
      l7.textContent = 'Original Text / Note';
      const i3 = document.createElement('input');
      i3.id = 'originalDateText';
      i3.className = 'input';
      i3.placeholder = "e.g., Instructor mentioned 'next Friday before midnight'";
      i3.value = originalDateText;
      i3.oninput = (e) => { originalDateText = e.target.value; };
      f7.appendChild(l7);
      f7.appendChild(i3);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'planner-form-actions';
    const cancelBtn = Button({ children: 'Cancel', variant: 'outline', onClick: () => { isModalOpen = false; render(); } });
    const saveBtn = Button({ children: editingDeadline ? 'Save Changes' : 'Schedule Deadline', variant: 'primary', isLoading: isSubmitting, type: 'submit' });
    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(saveBtn);

    formEl.appendChild(f1);
    formEl.appendChild(row);
    formEl.appendChild(f4);
    formEl.appendChild(f5);
    formEl.appendChild(f6);
    if (f7) formEl.appendChild(f7);
    formEl.appendChild(actionsDiv);

    const dialog = modal.querySelector('.card');
    dialog.appendChild(formEl);
    container.appendChild(modal);
  }

  // Delete Confirmation Modal
  if (deletingId) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { deletingId = null; render(); },
      title: 'Delete Deadline',
      description: 'Are you sure you want to delete this deadline? Associated reminders will also be cancelled.',
    });
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'planner-delete-actions';
    const cancelBtn = Button({ children: 'Cancel', variant: 'outline', onClick: () => { deletingId = null; render(); } });
    const delBtn = Button({ children: 'Confirm Deletion', variant: 'danger', onClick: confirmDelete });
    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(delBtn);
    const dialog = modal.querySelector('.card');
    dialog.appendChild(actionsDiv);
    container.appendChild(modal);
  }

  fetchPlanner();
  return container;
}
