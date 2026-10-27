import { api } from '../api.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { EmptyState } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';
import { Modal } from '../components/index.js';

export function render() {
  const container = document.createElement('div');
  container.className = 'productivity-page reminders-page';

  let reminders = [];
  let deadlines = [];
  let isLoading = true;
  let error = null;

  let isModalOpen = false;
  let title = '';
  let message = '';
  let remindAt = '';
  let leadTimeMinutes = 60;
  let selectedDeadlineId = '';
  let selectedTaskId = '';
  let isSubmitting = false;

  function fetchReminders() {
    isLoading = true;
    error = null;
    render();
    Promise.all([api.listReminders(), api.listDeadlines({ upcoming_only: true })])
      .then(([rems, dlines]) => {
        reminders = rems;
        deadlines = dlines;
        isLoading = false;
        render();
      })
      .catch((err) => {
        error = err.message || 'Failed to fetch reminders.';
        isLoading = false;
        render();
      });
  }

  async function handleCreateReminder(e) {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    isSubmitting = true;
    render();
    try {
      await api.createReminder({
        title: title.trim(),
        message: message.trim() || undefined,
        remind_at: new Date(remindAt).toISOString(),
        lead_time_minutes: leadTimeMinutes,
        deadline_id: selectedDeadlineId || undefined,
        task_id: selectedTaskId || undefined,
      });
      isModalOpen = false;
      title = ''; message = ''; remindAt = ''; selectedDeadlineId = ''; selectedTaskId = '';
      fetchReminders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to schedule reminder.');
    } finally {
      isSubmitting = false;
      render();
    }
  }

  async function handleDismiss(id) {
    try {
      await api.dismissReminder(id);
      reminders = reminders.map((r) => (r.id === id ? { ...r, status: 'Dismissed' } : r));
      render();
    } catch (err) {
      console.error(err);
    }
  }

  const heading = document.createElement('div');
  heading.className = 'page-heading';
  const left = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Reminders & Alerts';
  const desc = document.createElement('p');
  desc.className = 'page-description';
  desc.textContent = 'Manage in-app reminders. StudentOS also sends automatic reminders for tasks and deadlines at 3 days, 1 day, and 2 hours before their due date, plus one notification when an item becomes overdue.';
  left.appendChild(h1);
  left.appendChild(desc);
  const scheduleBtn = Button({ children: 'Schedule Reminder', variant: 'primary', onClick: () => { isModalOpen = true; render(); }, icon: 'plus' });
  heading.appendChild(left);
  heading.appendChild(scheduleBtn);
  container.appendChild(heading);

  if (isLoading) {
    container.appendChild(LoadingSkeleton({ rows: 4, height: '70px' }));
  } else if (error) {
    container.appendChild(EmptyState({
      icon: icon('alertCircle'),
      title: 'Could not load reminders',
      description: error,
      action: Button({ children: 'Retry', onClick: fetchReminders }),
    }));
  } else if (reminders.length === 0) {
    container.appendChild(EmptyState({
      icon: icon('bell'),
      title: 'No scheduled reminders',
      description: 'Schedule a reminder for assignment submissions or exam study sessions.',
      action: Button({ children: 'Create First Reminder', variant: 'primary', onClick: () => { isModalOpen = true; render(); } }),
    }));
  } else {
    const list = document.createElement('div');
    list.className = 'planner-list';
    reminders.forEach((reminder) => {
      const row = document.createElement('div');
      row.className = `card card-hover reminder-row${reminder.status === 'Dismissed' ? ' is-dismissed' : ''}`;
      const main = document.createElement('div');
      main.className = 'reminder-main';
      const titleRow = document.createElement('div');
      titleRow.className = 'reminder-title-row';
      const titleText = document.createElement('span');
      titleText.className = 'reminder-title-text';
      titleText.textContent = reminder.title;
      const statusBadge = document.createElement('span');
      statusBadge.className = `badge reminder-status-badge ${reminder.status === 'Pending' ? 'is-pending' : 'is-dismissed'}`;
      statusBadge.textContent = reminder.status;
      titleRow.appendChild(titleText);
      titleRow.appendChild(statusBadge);
      main.appendChild(titleRow);
      if (reminder.message) {
        const msg = document.createElement('div');
        msg.className = 'reminder-message';
        msg.textContent = reminder.message;
        main.appendChild(msg);
      }
      const meta = document.createElement('div');
      meta.className = 'reminder-meta';
      const clock = document.createElement('span');
      clock.className = 'reminder-clock';
      clock.appendChild(icon('clock'));
      clock.appendChild(document.createTextNode(` Remind at: ${new Date(reminder.remind_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`));
      const lead = document.createElement('span');
      lead.textContent = ` Lead Time: ${reminder.lead_time_minutes} mins`;
      meta.appendChild(clock);
      meta.appendChild(lead);
      main.appendChild(meta);
      row.appendChild(main);
      if (reminder.status === 'Pending') {
        const dismissBtn = Button({ children: 'Dismiss', size: 'sm', variant: 'outline', onClick: () => handleDismiss(reminder.id) });
        row.appendChild(dismissBtn);
      }
      list.appendChild(row);
    });
    container.appendChild(list);
  }

  if (isModalOpen) {
    const modal = Modal({
      isOpen: true,
      onClose: () => { isModalOpen = false; render(); },
      title: 'Schedule In-App Reminder',
      description: 'Set a time-zone aware persistent reminder.',
    });
    const form = document.createElement('form');
    form.className = 'reminder-form';
    form.onsubmit = handleCreateReminder;

    const f1 = document.createElement('div');
    const l1 = document.createElement('label');
    l1.className = 'label';
    l1.htmlFor = 'remTitle';
    l1.textContent = 'Reminder Title *';
    const i1 = document.createElement('input');
    i1.id = 'remTitle';
    i1.required = true;
    i1.className = 'input';
    i1.placeholder = 'e.g., Submit Assignment 2 on portal';
    i1.value = title;
    i1.oninput = (e) => { title = e.target.value; };
    f1.appendChild(l1);
    f1.appendChild(i1);

    const f2 = document.createElement('div');
    const l2 = document.createElement('label');
    l2.className = 'label';
    l2.htmlFor = 'remMessage';
    l2.textContent = 'Optional Message / Notes';
    const ta = document.createElement('textarea');
    ta.id = 'remMessage';
    ta.rows = 2;
    ta.className = 'input';
    ta.placeholder = 'Check PDF formatting and upload code zip file.';
    ta.value = message;
    ta.oninput = (e) => { message = e.target.value; };
    f2.appendChild(l2);
    f2.appendChild(ta);

    const row = document.createElement('div');
    row.className = 'reminder-form-row';
    const f3 = document.createElement('div');
    const l3 = document.createElement('label');
    l3.className = 'label';
    l3.htmlFor = 'remTime';
    l3.textContent = 'Remind At (Date & Time) *';
    const i2 = document.createElement('input');
    i2.id = 'remTime';
    i2.type = 'datetime-local';
    i2.required = true;
    i2.className = 'input';
    i2.value = remindAt;
    i2.oninput = (e) => { remindAt = e.target.value; };
    f3.appendChild(l3);
    f3.appendChild(i2);

    const f4 = document.createElement('div');
    const l4 = document.createElement('label');
    l4.className = 'label';
    l4.htmlFor = 'remLead';
    l4.textContent = 'Lead Time (Minutes before event)';
    const s1 = document.createElement('select');
    s1.id = 'remLead';
    s1.className = 'input';
    s1.value = String(leadTimeMinutes);
    s1.onchange = (e) => { leadTimeMinutes = parseInt(e.target.value, 10); };
    [15, 30, 60, 120, 1440].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = v === 1440 ? '24 hours (1 day)' : v === 120 ? '2 hours' : v === 60 ? '1 hour' : v === 30 ? '30 minutes' : '15 minutes';
      s1.appendChild(opt);
    });
    f4.appendChild(l4);
    f4.appendChild(s1);
    row.appendChild(f3);
    row.appendChild(f4);

    const f5 = document.createElement('div');
    const l5 = document.createElement('label');
    l5.className = 'label';
    l5.htmlFor = 'remDeadline';
    l5.textContent = 'Link to Academic Deadline (Optional)';
    const s2 = document.createElement('select');
    s2.id = 'remDeadline';
    s2.className = 'input';
    s2.value = selectedDeadlineId;
    s2.onchange = (e) => { selectedDeadlineId = e.target.value; };
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = 'None';
    s2.appendChild(optNone);
    deadlines.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.title} (${new Date(d.due_date).toLocaleDateString()})`;
      s2.appendChild(opt);
    });
    f5.appendChild(l5);
    f5.appendChild(s2);

    const actions = document.createElement('div');
    actions.className = 'reminder-form-actions';
    const cancelBtn = Button({ children: 'Cancel', variant: 'outline', onClick: () => { isModalOpen = false; render(); } });
    const submitBtn = Button({ children: 'Schedule Reminder', variant: 'primary', isLoading: isSubmitting, type: 'submit' });
    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);

    form.appendChild(f1);
    form.appendChild(f2);
    form.appendChild(row);
    form.appendChild(f5);
    form.appendChild(actions);

    const dialog = modal.querySelector('.card');
    dialog.appendChild(form);
    container.appendChild(modal);
  }

  fetchReminders();
  return container;
}
