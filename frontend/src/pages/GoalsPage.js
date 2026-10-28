import { api } from '../api.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';

export function render() {
  const container = document.createElement('section');
  container.className = 'productivity-page';

  let goals = [];
  let title = '';
  let category = 'Career';
  let targetDate = '';
  let milestoneMap = {};
  let error = '';

  function load() {
    api.listGoals().then((items) => { goals = items; renderPage(); }).catch((e) => {
      error = e instanceof Error ? e.message : 'Could not load goals.';
      renderPage();
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createGoal({ title: title.trim(), category, target_date: targetDate ? new Date(targetDate).toISOString() : undefined });
      title = ''; targetDate = '';
      load();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create goal.';
      renderPage();
    }
  }

  async function addMilestone(goal) {
    const value = (milestoneMap[goal.id] || '').trim();
    if (!value) return;
    try {
      await api.addGoalMilestone(goal.id, { title: value, create_task: true });
      milestoneMap[goal.id] = '';
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add milestone.');
    }
  }

  async function completeMilestone(id) {
    try {
      await api.updateGoalMilestone(id, { status: 'Completed' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to complete milestone.');
    }
  }

  async function deleteGoal(id) {
    try {
      await api.deleteGoal(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete goal.');
    }
  }

  function renderPage() {
    container.replaceChildren();

  const header = document.createElement('header');
  header.className = 'card page-intro-card';
  const label = document.createElement('span');
  label.className = 'sidebar-section-label';
  label.textContent = 'ACADEMIC & CAREER GOALS';
  const h1 = document.createElement('h1');
  h1.className = 'page-title page-title-dark';
  h1.textContent = 'Goals';
  const p = document.createElement('p');
  p.className = 'page-description';
  p.textContent = 'Turn a longer-term aim into milestones that appear in your planner.';
  header.appendChild(label);
  header.appendChild(h1);
  header.appendChild(p);
  container.appendChild(header);

  const form = document.createElement('form');
  form.className = 'card goal-create-form';
  form.onsubmit = handleCreate;

  const l1 = document.createElement('label');
  l1.className = 'goals-create-label';
  const l1span = document.createElement('span');
  l1span.className = 'label';
  l1span.textContent = 'New goal';
  const i1 = document.createElement('input');
  i1.className = 'input';
  i1.placeholder = 'e.g. Prepare for campus placements';
  i1.value = title;
  i1.oninput = (e) => { title = e.target.value; };
  l1.appendChild(l1span);
  l1.appendChild(i1);

  const l2 = document.createElement('label');
  const l2span = document.createElement('span');
  l2span.className = 'label';
  l2span.textContent = 'Category';
  const s1 = document.createElement('select');
  s1.className = 'input';
  s1.value = category;
  s1.onchange = (e) => { category = e.target.value; };
  ['Career', 'Academics', 'DSA', 'Personal'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    s1.appendChild(opt);
  });
  l2.appendChild(l2span);
  l2.appendChild(s1);

  const l3 = document.createElement('label');
  const l3span = document.createElement('span');
  l3span.className = 'label';
  l3span.textContent = 'Target date';
  const i2 = document.createElement('input');
  i2.className = 'input';
  i2.type = 'date';
  i2.value = targetDate;
  i2.oninput = (e) => { targetDate = e.target.value; };
  l3.appendChild(l3span);
  l3.appendChild(i2);

  const createBtn = Button({ children: 'Create goal', variant: 'primary', type: 'submit', icon: 'plus' });

  form.appendChild(l1);
  form.appendChild(l2);
  form.appendChild(l3);
  form.appendChild(createBtn);
  container.appendChild(form);

  if (error) {
    const err = document.createElement('p');
    err.setAttribute('role', 'alert');
    err.className = 'form-error';
    err.textContent = error;
    container.appendChild(err);
  }

  if (goals.length === 0) {
    container.appendChild(EmptyState({
      icon: icon('target'),
      title: 'No goals yet',
      description: 'Choose one academic or career outcome to work toward.',
    }));
    return container;
  }

  goals.forEach((goal) => {
    const article = document.createElement('article');
    article.className = 'card goal-card';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'goal-header';
    const info = document.createElement('div');
    const catLabel = document.createElement('div');
    catLabel.className = 'sidebar-section-label';
    catLabel.textContent = goal.category;
    const h2 = document.createElement('h2');
    h2.className = 'goal-title';
    h2.textContent = goal.title;
    info.appendChild(catLabel);
    info.appendChild(h2);
    if (goal.target_date) {
      const small = document.createElement('small');
      small.className = 'goal-target';
      small.textContent = `Target: ${new Date(goal.target_date).toLocaleDateString()}`;
      info.appendChild(small);
    }
    const actions = document.createElement('div');
    actions.className = 'goal-actions';
    const percent = document.createElement('strong');
    percent.className = 'goal-progress-value';
    percent.textContent = `${goal.progress_percent}%`;
    const delBtn = Button({
      children: '',
      size: 'sm',
      variant: 'danger',
      onClick: () => deleteGoal(goal.id),
      icon: 'trash2',
    });
    delBtn.setAttribute('aria-label', `Delete ${goal.title}`);
    actions.appendChild(percent);
    actions.appendChild(delBtn);
    headerDiv.appendChild(info);
    headerDiv.appendChild(actions);

    const track = document.createElement('div');
    track.className = 'goal-progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', `${goal.title} progress`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', goal.progress_percent);
    const fill = document.createElement('div');
    fill.className = 'goal-progress-fill';
    fill.style.width = `${goal.progress_percent}%`;
    const pctSpan = document.createElement('span');
    pctSpan.className = 'goal-progress-percent';
    pctSpan.textContent = `${goal.progress_percent}%`;
    track.appendChild(fill);
    track.appendChild(pctSpan);

    const milestoneList = document.createElement('div');
    milestoneList.className = 'milestone-list';
    if (goal.milestones.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'milestone-empty';
      empty.textContent = 'Add a milestone to break this goal into a next step.';
      milestoneList.appendChild(empty);
    } else {
      goal.milestones.forEach((item) => {
        const row = document.createElement('div');
        row.className = `milestone-row${(item.status === 'Completed' || item.task_completed) ? ' is-completed' : ''}`;
        const mTitle = document.createElement('span');
        mTitle.className = 'milestone-title';
        mTitle.textContent = item.title;
        row.appendChild(mTitle);
        if (item.status === 'Completed' || item.task_completed) {
          const iconEl = icon('checkCircle2');
          iconEl.className = 'milestone-complete-icon';
          iconEl.setAttribute('aria-label', 'Completed');
          iconEl.style.width = '18px';
          iconEl.style.height = '18px';
          row.appendChild(iconEl);
        } else {
          const btn = Button({ children: 'Complete', size: 'sm', variant: 'outline', onClick: () => completeMilestone(item.id) });
          row.appendChild(btn);
        }
        milestoneList.appendChild(row);
      });
    }

    const milestoneAdd = document.createElement('div');
    milestoneAdd.className = 'milestone-add';
    const mi = document.createElement('input');
    mi.className = 'input';
    mi.setAttribute('aria-label', `Add milestone to ${goal.title}`);
    mi.placeholder = 'Add a milestone';
    mi.value = milestoneMap[goal.id] || '';
    mi.oninput = (e) => { milestoneMap[goal.id] = e.target.value; };
    const addBtn = Button({ children: 'Add', size: 'sm', variant: 'secondary', onClick: () => addMilestone(goal) });
    milestoneAdd.appendChild(mi);
    milestoneAdd.appendChild(addBtn);

    article.appendChild(headerDiv);
    article.appendChild(track);
    article.appendChild(milestoneList);
    article.appendChild(milestoneAdd);
    container.appendChild(article);
  });

  }

  renderPage();
  load();
  return container;
}
