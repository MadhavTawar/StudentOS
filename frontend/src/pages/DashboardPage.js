import { auth } from '../auth.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';
import { PriorityBadge } from '../components/index.js';
import { StatusBadge } from '../components/index.js';
import { QuickAddTaskModal } from '../components/QuickAddTaskModal.js';

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function render() {
  const container = document.createElement('div');
  container.className = 'dashboard-page';

  let data = null;
  let goals = [];
  let deadlines = [];
  let knowledgeLibrary = [];
  let knowledgeAccess = null;
  let gmailConnected = false;
  let isLoading = true;
  let error = null;

  const currentDate = new Date();
  let calendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  let selectedCalendarDate = new Date();

  const studyGuideVisited = localStorage.getItem('studentos_study_guide_visited') === 'true';
  let getStartedDismissed = localStorage.getItem('studentos_get_started_dismissed') === 'true';

  // Quick task modal state
  let isQuickTaskOpen = false;
  let modalCleanup = null;

  const userName = auth.user?.full_name?.split(' ')[0] || 'Student';

  function fetchDashboard() {
    isLoading = true;
    error = null;
    renderDashboard();
    Promise.allSettled([
      api.getDashboardOverview(),
      api.listGoals(),
      api.listDeadlines({}),
      api.listKnowledgeLibrary(),
      api.getKnowledgeAccess(),
      api.getGmailStatus(),
    ]).then(([overviewRes, goalsRes, deadlinesRes, libraryRes, accessRes, gmailRes]) => {
      if (overviewRes.status === 'fulfilled') data = overviewRes.value;
      else error = overviewRes.reason?.message || 'Failed to load dashboard data.';
      if (goalsRes.status === 'fulfilled') goals = goalsRes.value;
      if (deadlinesRes.status === 'fulfilled') deadlines = deadlinesRes.value;
      if (libraryRes.status === 'fulfilled') knowledgeLibrary = libraryRes.value;
      if (accessRes.status === 'fulfilled') knowledgeAccess = accessRes.value;
      if (gmailRes.status === 'fulfilled') gmailConnected = !!gmailRes.value?.is_connected;
      isLoading = false;
      renderDashboard();
    }).catch((err) => {
      error = err.message || 'Failed to load dashboard data.';
      isLoading = false;
      renderDashboard();
    });
  }

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  async function handleToggleTask(taskId) {
    try {
      await api.toggleTask(taskId);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  }

  function buildCalendarCells() {
    const cells = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - calendarMonth.getDay() + i));
    }
    return cells;
  }

  function renderDashboard() {
    if (modalCleanup) {
      modalCleanup();
      modalCleanup = null;
    }
    container.innerHTML = '';

    if (isLoading) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'dashboard-page dashboard-loading';
      const row = document.createElement('div');
      row.className = 'dashboard-loading-row animate-pulse-glow';
      loadingDiv.appendChild(row);
      loadingDiv.appendChild(LoadingSkeleton({ rows: 4, height: '90px' }));
      container.appendChild(loadingDiv);
      return container;
    }

    if (!data) {
      const empty = EmptyState({
        icon: icon('alertCircle'),
        title: 'Could not load dashboard',
        description: error || 'Unable to fetch academic overview.',
        action: Button({ children: 'Retry', variant: 'primary', onClick: fetchDashboard, icon: 'refreshCw' }),
      });
      container.appendChild(empty);
      return container;
    }

    // Get started card
    if (!getStartedDismissed) {
      const canManage = !!knowledgeAccess?.can_manage_documents;
      const steps = [
        { id: 'task', title: 'Add your first task', line: 'Track coursework, assignments, and study sessions.', done: (data.stats?.total ?? 0) > 0, action: () => { isQuickTaskOpen = true; renderDashboard(); }, label: 'Add task' },
        { id: 'deadline', title: 'Add an exam or deadline', line: 'Never miss a due date again.', done: deadlines.length > 0, action: () => router.navigate('/app/planner?view=deadlines'), label: 'Add deadline' },
        { id: 'goal', title: 'Set a goal', line: 'Break big outcomes into milestones.', done: goals.length > 0, action: () => router.navigate('/app/goals'), label: 'Set goal' },
      ];
      if (canManage) {
        steps.push({ id: 'upload', title: 'Upload your notes', line: 'Publish PDFs or DOCX, then ask questions with sources.', done: knowledgeLibrary.length > 0, action: () => router.navigate('/app/knowledge/manage'), label: 'Upload' });
      } else {
        steps.push({ id: 'asklib', title: 'Ask the Library', line: 'Explore published study material.', done: knowledgeLibrary.length > 0, action: () => router.navigate('/app/knowledge'), label: 'Open Library' });
      }
      steps.push({ id: 'guide', title: 'Try the Study guide', line: 'Ask the Study companion anything.', done: studyGuideVisited, action: () => router.navigate('/app/learn'), label: 'Open guide' });
      steps.push({ id: 'gmail', title: 'Connect Gmail', line: 'Extract assignments from your inbox (optional).', done: gmailConnected, optional: true, action: () => router.navigate('/app/inbox'), label: 'Connect' });

      const requiredSteps = steps.filter((s) => !s.optional);
      const doneCount = steps.filter((s) => s.done).length;
      const allRequiredDone = requiredSteps.every((s) => s.done);

      const card = document.createElement('section');
      card.className = 'card dashboard-getstarted';

      if (allRequiredDone && doneCount === steps.length) {
        card.className += ' dashboard-getstarted-done';
        const p = document.createElement('p');
        p.className = 'dashboard-getstarted-done-text';
        p.textContent = 'You are all set. Dismiss to hide this message.';
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'dashboard-getstarted-dismiss';
        dismiss.textContent = 'Dismiss';
        dismiss.onclick = () => {
          getStartedDismissed = true;
          localStorage.setItem('studentos_get_started_dismissed', 'true');
          renderDashboard();
        };
        card.appendChild(p);
        card.appendChild(dismiss);
      } else {
        const header = document.createElement('div');
        header.className = 'dashboard-getstarted-header';
        const h2 = document.createElement('h2');
        h2.className = 'dashboard-getstarted-title';
        h2.textContent = 'Get started';
        const sub = document.createElement('p');
        sub.className = 'dashboard-getstarted-subtitle';
        sub.textContent = 'Complete these steps to set up your study space.';
        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'dashboard-getstarted-dismiss';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.setAttribute('aria-label', 'Dismiss get started card');
        dismissBtn.onclick = () => {
          getStartedDismissed = true;
          localStorage.setItem('studentos_get_started_dismissed', 'true');
          renderDashboard();
        };
        header.appendChild(h2);
        header.appendChild(sub);
        header.appendChild(dismissBtn);
        card.appendChild(header);

        const progress = document.createElement('div');
        progress.className = 'dashboard-getstarted-progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-label', 'Get started progress');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', steps.length);
        progress.setAttribute('aria-valuenow', doneCount);
        const track = document.createElement('div');
        track.className = 'dashboard-getstarted-progress-track';
        const fill = document.createElement('div');
        fill.className = 'dashboard-getstarted-progress-fill';
        fill.style.width = `${(doneCount / steps.length) * 100}%`;
        track.appendChild(fill);
        const text = document.createElement('span');
        text.className = 'dashboard-getstarted-progress-text';
        text.textContent = `${doneCount} of ${steps.length} done`;
        progress.appendChild(track);
        progress.appendChild(text);
        card.appendChild(progress);

        const list = document.createElement('ul');
        list.className = 'dashboard-getstarted-steps';
        steps.forEach((step) => {
          const li = document.createElement('li');
          li.className = `dashboard-getstarted-step${step.done ? ' is-done' : ''}${step.optional ? ' is-optional' : ''}`;
          const check = document.createElement('span');
          check.className = 'dashboard-getstarted-check';
          check.setAttribute('aria-hidden', 'true');
          check.textContent = step.done ? '\u2713' : '';
          const body = document.createElement('div');
          body.className = 'dashboard-getstarted-step-body';
          const titleDiv = document.createElement('div');
          titleDiv.className = 'dashboard-getstarted-step-title';
          titleDiv.textContent = step.title;
          if (step.optional) {
            const opt = document.createElement('span');
            opt.className = 'dashboard-getstarted-optional';
            opt.textContent = 'Optional';
            titleDiv.appendChild(opt);
          }
          const line = document.createElement('div');
          line.className = 'dashboard-getstarted-step-line';
          line.textContent = step.line;
          body.appendChild(titleDiv);
          body.appendChild(line);
          li.appendChild(check);
          li.appendChild(body);
          if (!step.done) {
            const btn = Button({ children: step.label, variant: 'outline', size: 'sm', onClick: step.action });
            li.appendChild(btn);
          }
          list.appendChild(li);
        });
        card.appendChild(list);
      }

      container.appendChild(card);
    }

    // Greeting header
    const masthead = document.createElement('header');
    masthead.className = 'dashboard-masthead';
    const welcome = document.createElement('div');
    welcome.className = 'dashboard-welcome';
    const kicker = document.createElement('div');
    kicker.className = 'dashboard-kicker';
    kicker.textContent = 'YOUR STUDY LIFE, IN ONE PLACE';
    const h1 = document.createElement('h1');
    h1.className = 'dashboard-title';
    h1.textContent = `${getGreeting()}, ${userName}`;
    const sub = document.createElement('p');
    sub.className = 'dashboard-subtitle';
    sub.textContent = 'Every task you complete is a step closer to your goals.';
    welcome.appendChild(kicker);
    welcome.appendChild(h1);
    welcome.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'dashboard-actions';
    const dateStamp = document.createElement('div');
    dateStamp.className = 'dashboard-date-stamp';
    const calIcon = icon('calendar');
    calIcon.style.width = '15px';
    calIcon.style.height = '15px';
    dateStamp.appendChild(calIcon);
    dateStamp.appendChild(document.createTextNode(currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })));
    const addTaskBtn = Button({ children: 'Add task', variant: 'primary', onClick: () => { isQuickTaskOpen = true; renderDashboard(); }, icon: 'plus' });
    actions.appendChild(dateStamp);
    actions.appendChild(addTaskBtn);
    masthead.appendChild(welcome);
    masthead.appendChild(actions);
    container.appendChild(masthead);

    // Stats cards
    const activeTasksCount = data.stats.pending + data.stats.in_progress;
    const upcomingCount = data.upcoming_deadlines.length;
    const overdueCount = data.stats.overdue;
    const completedCount = data.stats.completed;

    const statTiles = [
      { label: 'Active tasks', value: activeTasksCount, caption: `${data.stats.pending} pending · ${data.stats.in_progress} in progress`, icon: 'checkSquare', accent: 'var(--accent-primary)' },
      { label: 'Upcoming deadlines', value: upcomingCount, caption: 'Next 7 academic days', icon: 'calendar', accent: 'var(--accent-secondary)' },
      { label: 'Overdue tasks', value: overdueCount, caption: overdueCount > 0 ? 'Requires immediate focus' : 'All caught up', icon: 'alertCircle', accent: 'var(--accent-danger)' },
      { label: 'Completed tasks', value: completedCount, caption: `${data.stats.total - completedCount} remaining of ${data.stats.total}`, icon: 'checkCircle2', accent: 'var(--accent-success)' },
    ];

    const statsGrid = document.createElement('div');
    statsGrid.className = 'dashboard-stats';
    statTiles.forEach((tile) => {
      const stat = document.createElement('div');
      stat.className = 'dashboard-stat';
      stat.style.setProperty('--stat-accent', tile.accent);
      const body = document.createElement('div');
      body.className = 'dashboard-stat-body';
      const label = document.createElement('div');
      label.className = 'dashboard-stat-label';
      label.textContent = tile.label;
      const value = document.createElement('div');
      value.className = 'dashboard-stat-value';
      value.textContent = tile.value;
      const caption = document.createElement('div');
      caption.className = 'dashboard-stat-caption';
      caption.textContent = tile.caption;
      body.appendChild(label);
      body.appendChild(value);
      body.appendChild(caption);
      const iconDiv = document.createElement('div');
      iconDiv.className = 'dashboard-stat-icon';
      iconDiv.style.color = tile.accent;
      iconDiv.appendChild(icon(tile.icon));
      stat.appendChild(body);
      stat.appendChild(iconDiv);
      statsGrid.appendChild(stat);
    });
    container.appendChild(statsGrid);

    // Main grid
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    // Left column
    const left = document.createElement('div');
    left.className = 'dashboard-left';

    // Today timeline
    const todaySection = document.createElement('section');
    todaySection.className = 'card dashboard-card dashboard-today';
    const todayHeader = document.createElement('div');
    todayHeader.className = 'dashboard-card-header';
    const titleRow = document.createElement('div');
    titleRow.className = 'dashboard-card-title-row';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'dashboard-card-icon';
    iconDiv.appendChild(icon('clock'));
    const h2 = document.createElement('h2');
    h2.className = 'dashboard-card-title';
    h2.textContent = 'Today';
    const link = document.createElement('a');
    link.className = 'dashboard-card-link';
    link.href = '/app/planner';
    link.textContent = 'Open planner ';
    link.appendChild(icon('arrowRight'));
    link.onclick = (e) => { e.preventDefault(); router.navigate('/app/planner'); };
    titleRow.appendChild(iconDiv);
    titleRow.appendChild(h2);
    titleRow.appendChild(link);
    todayHeader.appendChild(titleRow);

    const timeline = document.createElement('div');
    timeline.className = 'dashboard-timeline';

    const markedDates = new Set([
      ...data.pending_tasks.flatMap((task) => (task.due_date ? [dateKey(new Date(task.due_date))] : [])),
      ...data.upcoming_deadlines.map((deadline) => dateKey(new Date(deadline.due_date))),
    ]);
    const selectedDateKey = dateKey(selectedCalendarDate);
    const todayKey = dateKey(currentDate);

    const hourGroups = new Map();
    const anytimeItems = [];
    const todayItems = [
      ...data.pending_tasks.filter((t) => t.due_date && dateKey(new Date(t.due_date)) === todayKey),
      ...data.upcoming_deadlines.filter((d) => dateKey(new Date(d.due_date)) === todayKey),
    ];

    todayItems.forEach((item) => {
      if (!item.due_date) { anytimeItems.push(item); return; }
      const d = new Date(item.due_date);
      if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) { anytimeItems.push(item); return; }
      const key = String(d.getHours()).padStart(2, '0');
      const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!hourGroups.has(key)) hourGroups.set(key, { label, items: [] });
      hourGroups.get(key).items.push(item);
    });

    hourGroups.forEach(({ label, items }) => {
      const slot = document.createElement('div');
      slot.className = 'dashboard-timeline-slot';
      const time = document.createElement('span');
      time.className = 'dashboard-timeline-time';
      time.textContent = label;
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'dashboard-timeline-items';
      items.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dashboard-timeline-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.status === 'Completed';
        checkbox.setAttribute('aria-label', `Complete ${item.title}`);
        checkbox.className = 'dashboard-checkbox';
        checkbox.onchange = () => handleToggleTask(item.id);
        const body = document.createElement('div');
        body.className = 'dashboard-timeline-item-body';
        const title = document.createElement('div');
        title.className = 'dashboard-timeline-item-title';
        title.textContent = item.title;
        body.appendChild(title);
        if (item.due_date) {
          const meta = document.createElement('div');
          meta.className = 'dashboard-timeline-item-meta';
          meta.textContent = new Date(item.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' });
          body.appendChild(meta);
        }
        if (item.priority) {
          itemDiv.appendChild(PriorityBadge({ priority: item.priority }));
        }
        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(body);
        itemsDiv.appendChild(itemDiv);
      });
      slot.appendChild(time);
      slot.appendChild(itemsDiv);
      timeline.appendChild(slot);
    });

    if (anytimeItems.length > 0) {
      const slot = document.createElement('div');
      slot.className = 'dashboard-timeline-slot';
      const time = document.createElement('span');
      time.className = 'dashboard-timeline-time';
      time.textContent = 'Anytime';
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'dashboard-timeline-items';
      anytimeItems.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dashboard-timeline-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.status === 'Completed';
        checkbox.setAttribute('aria-label', `Complete ${item.title}`);
        checkbox.className = 'dashboard-checkbox';
        checkbox.onchange = () => handleToggleTask(item.id);
        const body = document.createElement('div');
        body.className = 'dashboard-timeline-item-body';
        const title = document.createElement('div');
        title.className = 'dashboard-timeline-item-title';
        title.textContent = item.title;
        body.appendChild(title);
        if (item.priority) itemDiv.appendChild(PriorityBadge({ priority: item.priority }));
        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(body);
        itemsDiv.appendChild(itemDiv);
      });
      slot.appendChild(time);
      slot.appendChild(itemsDiv);
      timeline.appendChild(slot);
    }

    if (hourGroups.size === 0 && anytimeItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dashboard-timeline-empty';
      empty.textContent = 'Nothing due today.';
      const btn = Button({ children: 'Add task', variant: 'outline', size: 'sm', onClick: () => { isQuickTaskOpen = true; renderDashboard(); }, icon: 'plus' });
      empty.appendChild(btn);
      timeline.appendChild(empty);
    }

    todaySection.appendChild(todayHeader);
    todaySection.appendChild(timeline);
    left.appendChild(todaySection);

    // Tasks table
    const tasksSection = document.createElement('section');
    tasksSection.className = 'card dashboard-card dashboard-tasks';
    const tasksHeader = document.createElement('div');
    tasksHeader.className = 'dashboard-card-header';
    const tasksTitleRow = document.createElement('div');
    tasksTitleRow.className = 'dashboard-card-title-row';
    const tasksIcon = document.createElement('div');
    tasksIcon.className = 'dashboard-card-icon';
    tasksIcon.appendChild(icon('checkSquare'));
    const tasksH2 = document.createElement('h2');
    tasksH2.className = 'dashboard-card-title';
    tasksH2.textContent = 'Active tasks';
    const tasksLink = document.createElement('a');
    tasksLink.className = 'dashboard-card-link';
    tasksLink.href = '/app/tasks';
    tasksLink.textContent = 'View all ';
    tasksLink.appendChild(icon('arrowRight'));
    tasksLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/tasks'); };
    tasksTitleRow.appendChild(tasksIcon);
    tasksTitleRow.appendChild(tasksH2);
    tasksTitleRow.appendChild(tasksLink);
    tasksHeader.appendChild(tasksTitleRow);
    tasksSection.appendChild(tasksHeader);

    if (data.pending_tasks.length === 0) {
      tasksSection.appendChild(EmptyState({
        icon: icon('checkCircle2'),
        title: 'No active tasks yet',
        description: 'Add your first task to get started.',
      }));
    } else {
      const table = document.createElement('div');
      table.className = 'dashboard-task-table';
      data.pending_tasks.forEach((task) => {
        const row = document.createElement('div');
        row.className = 'dashboard-task-row';
        const mainDiv = document.createElement('div');
        mainDiv.className = 'dashboard-task-main';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.status === 'Completed';
        checkbox.setAttribute('aria-label', `Complete ${task.title}`);
        checkbox.className = 'dashboard-checkbox';
        checkbox.onchange = () => handleToggleTask(task.id);
        const body = document.createElement('div');
        body.className = 'dashboard-task-body';
        const title = document.createElement('div');
        title.className = 'dashboard-task-title';
        title.textContent = task.title;
        body.appendChild(title);
        if (task.due_date) {
          const meta = document.createElement('div');
          meta.className = 'dashboard-task-meta';
          const clock = icon('clock');
          clock.style.width = '12px';
          clock.style.height = '12px';
          clock.className = 'dashboard-task-meta-icon';
          meta.appendChild(clock);
          meta.appendChild(document.createTextNode(new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })));
          body.appendChild(meta);
        }
        mainDiv.appendChild(checkbox);
        mainDiv.appendChild(body);
        const tags = document.createElement('div');
        tags.className = 'dashboard-task-tags';
        tags.appendChild(StatusBadge({ status: task.status }));
        tags.appendChild(PriorityBadge({ priority: task.priority }));
        const chevr = document.createElement('div');
        chevr.className = 'dashboard-task-chevr';
        const taskLink = document.createElement('a');
        taskLink.className = 'dashboard-task-link';
        taskLink.href = `/app/tasks/${task.id}`;
        taskLink.textContent = '';
        taskLink.appendChild(icon('arrowRight'));
        taskLink.onclick = (e) => { e.preventDefault(); router.navigate(`/app/tasks/${task.id}`); };
        chevr.appendChild(taskLink);
        row.appendChild(mainDiv);
        row.appendChild(tags);
        row.appendChild(chevr);
        table.appendChild(row);
      });
      tasksSection.appendChild(table);
    }
    left.appendChild(tasksSection);
    grid.appendChild(left);

    // Right rail
    const right = document.createElement('div');
    right.className = 'dashboard-right';

    if (data.next_big_date) {
      const nextBig = document.createElement('section');
      nextBig.className = 'card dashboard-card dashboard-next-big';
      const label = document.createElement('div');
      label.className = 'dashboard-next-big-label';
      label.textContent = 'Next big date';
      const title = document.createElement('div');
      title.className = 'dashboard-next-big-title';
      title.textContent = data.next_big_date.title;
      const date = document.createElement('div');
      date.className = 'dashboard-next-big-date';
      date.textContent = new Date(data.next_big_date.due_date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      nextBig.appendChild(label);
      nextBig.appendChild(title);
      nextBig.appendChild(date);
      right.appendChild(nextBig);
    }

    // Calendar
    const calendarSection = document.createElement('section');
    calendarSection.className = 'card dashboard-card dashboard-calendar';
    const calHeader = document.createElement('div');
    calHeader.className = 'dashboard-card-header';
    const calTitleRow = document.createElement('div');
    calTitleRow.className = 'dashboard-card-title-row';
    const calSectionIcon = document.createElement('div');
    calSectionIcon.className = 'dashboard-card-icon';
    calSectionIcon.appendChild(icon('calendar'));
    const calH2 = document.createElement('h2');
    calH2.className = 'dashboard-card-title';
    calH2.textContent = 'Schedule';
    const calControls = document.createElement('div');
    calControls.className = 'dashboard-calendar-controls';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.appendChild(icon('chevronLeft'));
    prevBtn.onclick = () => {
      const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
      calendarMonth = next;
      if (selectedCalendarDate.getMonth() !== next.getMonth() || selectedCalendarDate.getFullYear() !== next.getFullYear()) selectedCalendarDate = next;
      renderDashboard();
    };
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.appendChild(icon('chevronRight'));
    nextBtn.onclick = () => {
      const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
      calendarMonth = next;
      if (selectedCalendarDate.getMonth() !== next.getMonth() || selectedCalendarDate.getFullYear() !== next.getFullYear()) selectedCalendarDate = next;
      renderDashboard();
    };
    calControls.appendChild(prevBtn);
    calControls.appendChild(nextBtn);
    calTitleRow.appendChild(calIcon);
    calTitleRow.appendChild(calH2);
    calTitleRow.appendChild(calControls);
    calHeader.appendChild(calTitleRow);
    calendarSection.appendChild(calHeader);

    const calHeading = document.createElement('div');
    calHeading.className = 'dashboard-calendar-heading';
    const calMonth = document.createElement('div');
    calMonth.className = 'dashboard-calendar-month';
    calMonth.textContent = calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
    calHeading.appendChild(calMonth);
    calendarSection.appendChild(calHeading);

    const calGrid = document.createElement('div');
    calGrid.className = 'dashboard-calendar-grid';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
      const span = document.createElement('span');
      span.className = 'dashboard-calendar-weekday';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = day;
      calGrid.appendChild(span);
    });
    buildCalendarCells().forEach((day) => {
      const key = dateKey(day);
      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
      const isToday = key === todayKey;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `dashboard-calendar-day${isCurrentMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${key === selectedDateKey ? ' is-selected' : ''}${markedDates.has(key) ? ' has-events' : ''}`;
      btn.setAttribute('aria-label', `${day.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}${markedDates.has(key) ? ', has scheduled work' : ''}`);
      btn.setAttribute('aria-pressed', key === selectedDateKey);
      btn.textContent = day.getDate();
      if (markedDates.has(key)) {
        const dot = document.createElement('span');
        dot.className = 'dashboard-calendar-dot';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
      }
      btn.onclick = () => {
        selectedCalendarDate = day;
        if (!isCurrentMonth) calendarMonth = new Date(day.getFullYear(), day.getMonth(), 1);
        renderDashboard();
      };
      calGrid.appendChild(btn);
    });
    calendarSection.appendChild(calGrid);

    const calSelected = document.createElement('div');
    calSelected.className = 'dashboard-calendar-selected';
    const calSelectedHeading = document.createElement('div');
    calSelectedHeading.className = 'dashboard-calendar-selected-heading';
    const strong = document.createElement('strong');
    strong.textContent = selectedCalendarDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const plannerLink = document.createElement('a');
    plannerLink.className = 'dashboard-calendar-planner-link';
    plannerLink.href = '/app/planner?view=deadlines';
    plannerLink.textContent = ' Planner ';
    plannerLink.appendChild(icon('arrowRight'));
    plannerLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/planner?view=deadlines'); };
    calSelectedHeading.appendChild(strong);
    calSelectedHeading.appendChild(plannerLink);
    calSelected.appendChild(calSelectedHeading);

    const selectedDayTasks = data.pending_tasks.filter((task) => task.due_date && dateKey(new Date(task.due_date)) === selectedDateKey);
    const selectedDayDeadlines = data.upcoming_deadlines.filter((deadline) => dateKey(new Date(deadline.due_date)) === selectedDateKey);

    if (selectedDayTasks.length + selectedDayDeadlines.length === 0) {
      const p = document.createElement('p');
      p.className = 'dashboard-calendar-empty';
      p.textContent = 'No tasks or deadlines for this date.';
      calSelected.appendChild(p);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'dashboard-calendar-list';
      selectedDayTasks.slice(0, 3).forEach((task) => {
        const li = document.createElement('li');
        li.className = 'dashboard-calendar-list-item';
        const mark = document.createElement('span');
        mark.className = 'dashboard-calendar-event-mark task-mark';
        li.appendChild(mark);
        li.appendChild(document.createTextNode(task.title));
        ul.appendChild(li);
      });
      selectedDayDeadlines.slice(0, 3).forEach((deadline) => {
        const li = document.createElement('li');
        li.className = 'dashboard-calendar-list-item';
        const mark = document.createElement('span');
        mark.className = 'dashboard-calendar-event-mark deadline-mark';
        li.appendChild(mark);
        li.appendChild(document.createTextNode(deadline.title));
        ul.appendChild(li);
      });
      calSelected.appendChild(ul);
    }
    calendarSection.appendChild(calSelected);
    right.appendChild(calendarSection);

    // Goals
    const goalsSection = document.createElement('section');
    goalsSection.className = 'card dashboard-card dashboard-goals';
    const goalsHeader = document.createElement('div');
    goalsHeader.className = 'dashboard-card-header';
    const goalsTitleRow = document.createElement('div');
    goalsTitleRow.className = 'dashboard-card-title-row';
    const goalsIcon = document.createElement('div');
    goalsIcon.className = 'dashboard-card-icon';
    goalsIcon.appendChild(icon('checkSquare'));
    const goalsH2 = document.createElement('h2');
    goalsH2.className = 'dashboard-card-title';
    goalsH2.textContent = 'Goals';
    const goalsLink = document.createElement('a');
    goalsLink.className = 'dashboard-card-link';
    goalsLink.href = '/app/goals';
    goalsLink.textContent = 'Manage goals ';
    goalsLink.appendChild(icon('arrowRight'));
    goalsLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/goals'); };
    goalsTitleRow.appendChild(goalsIcon);
    goalsTitleRow.appendChild(goalsH2);
    goalsTitleRow.appendChild(goalsLink);
    goalsHeader.appendChild(goalsTitleRow);
    goalsSection.appendChild(goalsHeader);

    if (goals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dashboard-goals-empty';
      empty.textContent = 'No goals yet. Create your first goal to track progress.';
      goalsSection.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'dashboard-goals-list';
      goals.filter((g) => g.status === 'Active').slice(0, 3).forEach((goal) => {
        const row = document.createElement('div');
        row.className = 'dashboard-goal-row';
        const info = document.createElement('div');
        info.className = 'dashboard-goal-info';
        const title = document.createElement('div');
        title.className = 'dashboard-goal-title';
        title.textContent = goal.title;
        const caption = document.createElement('div');
        caption.className = 'dashboard-goal-caption';
        caption.textContent = `${goal.completed_milestones} of ${goal.total_milestones} milestones`;
        info.appendChild(title);
        info.appendChild(caption);
        const progress = document.createElement('div');
        progress.className = 'dashboard-goal-progress';
        const track = document.createElement('div');
        track.className = 'dashboard-goal-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', `${goal.title} progress`);
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
        track.setAttribute('aria-valuenow', goal.progress_percent);
        const bar = document.createElement('div');
        bar.className = 'dashboard-goal-bar';
        bar.style.width = `${goal.progress_percent}%`;
        track.appendChild(bar);
        const percent = document.createElement('span');
        percent.className = 'dashboard-goal-percent';
        percent.textContent = `${goal.progress_percent}%`;
        progress.appendChild(track);
        progress.appendChild(percent);
        row.appendChild(info);
        row.appendChild(progress);
        list.appendChild(row);
      });
      goalsSection.appendChild(list);
    }
    right.appendChild(goalsSection);
    grid.appendChild(right);

    container.appendChild(grid);

    // Attention strip
    const attention = document.createElement('div');
    attention.className = 'dashboard-attention';

    const attentionCard = document.createElement('section');
    attentionCard.className = 'card dashboard-card dashboard-attention-card';
    const attHeader = document.createElement('div');
    attHeader.className = 'dashboard-card-header';
    const attTitleRow = document.createElement('div');
    attTitleRow.className = 'dashboard-card-title-row';
    const attIcon = document.createElement('div');
    attIcon.className = 'dashboard-card-icon';
    attIcon.appendChild(icon('arrowRight'));
    const attH2 = document.createElement('h2');
    attH2.className = 'dashboard-card-title';
    attH2.textContent = 'What deserves attention next';
    const attLink = document.createElement('a');
    attLink.className = 'dashboard-card-link';
    attLink.href = '/app/planner';
    attLink.textContent = 'Open planner ';
    attLink.appendChild(icon('arrowRight'));
    attLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/planner'); };
    attTitleRow.appendChild(attIcon);
    attTitleRow.appendChild(attH2);
    attTitleRow.appendChild(attLink);
    attHeader.appendChild(attTitleRow);
    attentionCard.appendChild(attHeader);

    if (data.daily_priorities.length === 0) {
      attentionCard.appendChild(EmptyState({
        icon: icon('checkCircle2'),
        title: 'Nothing tracked yet',
        description: 'Add a task or connect Gmail to start building your study plan.',
        action: Button({ children: 'Add a task', variant: 'outline', onClick: () => { isQuickTaskOpen = true; renderDashboard(); }, icon: 'plus' }),
      }));
    } else {
      const priorities = document.createElement('div');
      priorities.className = 'dashboard-priorities';
      data.daily_priorities.forEach(({ task, reason }) => {
        const item = document.createElement('div');
        item.className = 'dashboard-priority-item';
        const body = document.createElement('div');
        body.className = 'dashboard-priority-body';
        const title = document.createElement('div');
        title.className = 'dashboard-priority-title';
        title.textContent = task.title;
        const reasonDiv = document.createElement('div');
        reasonDiv.className = 'dashboard-priority-reason';
        reasonDiv.textContent = `${reason}${task.due_date ? ` · ${new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}`;
        body.appendChild(title);
        body.appendChild(reasonDiv);
        item.appendChild(body);
        item.appendChild(PriorityBadge({ priority: task.priority }));
        priorities.appendChild(item);
      });
      attentionCard.appendChild(priorities);
    }
    attention.appendChild(attentionCard);

    const proposalsCard = document.createElement('section');
    proposalsCard.className = 'card dashboard-card dashboard-proposals';
    const propHeader = document.createElement('div');
    propHeader.className = 'dashboard-card-header';
    const propTitleRow = document.createElement('div');
    propTitleRow.className = 'dashboard-card-title-row';
    const propIcon = document.createElement('div');
    propIcon.className = 'dashboard-card-icon';
    propIcon.appendChild(icon('alertCircle'));
    const propH2 = document.createElement('h2');
    propH2.className = 'dashboard-card-title';
    propH2.textContent = 'AI proposals waiting for approval';
    const propLink = document.createElement('a');
    propLink.className = 'dashboard-card-link';
    propLink.href = '/app/inbox';
    propLink.textContent = 'Review inbox ';
    propLink.appendChild(icon('arrowRight'));
    propLink.onclick = (e) => { e.preventDefault(); router.navigate('/app/inbox'); };
    propTitleRow.appendChild(propIcon);
    propTitleRow.appendChild(propH2);
    propTitleRow.appendChild(propLink);
    propHeader.appendChild(propTitleRow);
    proposalsCard.appendChild(propHeader);

    if (data.ai_proposals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dashboard-proposals-empty';
      empty.textContent = 'No pending task proposals. Connect Gmail or upload syllabi to extract deadlines automatically.';
      proposalsCard.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'dashboard-proposal-list';
      data.ai_proposals.forEach((prop) => {
        const item = document.createElement('div');
        item.className = 'dashboard-proposal-item';
        const body = document.createElement('div');
        body.className = 'dashboard-proposal-body';
        const title = document.createElement('div');
        title.className = 'dashboard-proposal-title';
        title.textContent = prop.title;
        const source = document.createElement('div');
        source.className = 'dashboard-proposal-source';
        source.textContent = `From: ${prop.email_subject}`;
        body.appendChild(title);
        body.appendChild(source);
        const btn = document.createElement('a');
        btn.className = 'btn btn-primary btn-sm';
        btn.href = '/app/inbox';
        btn.textContent = 'Review';
        btn.onclick = (e) => { e.preventDefault(); router.navigate('/app/inbox'); };
        item.appendChild(body);
        item.appendChild(btn);
        list.appendChild(item);
      });
      proposalsCard.appendChild(list);
    }
    attention.appendChild(proposalsCard);
    container.appendChild(attention);

    // Quick Add Task Modal (via shared component)
    if (isQuickTaskOpen) {
      const modal = QuickAddTaskModal({
        isOpen: true,
        onClose: () => { isQuickTaskOpen = false; renderDashboard(); },
        onTaskCreated: () => { fetchDashboard(); },
      });
      container.appendChild(modal.element);
      modalCleanup = modal.cleanup;
    }

    return container;
  }

  renderDashboard();
  fetchDashboard();
  return container;
}
