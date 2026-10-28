import { api } from '../api.js';

export function QuickAddTaskModal({ isOpen, onClose, onTaskCreated }) {
  if (!isOpen) return null;

  let taskTitle = '';
  let taskCategory = 'Assignment';
  let taskPriority = 'Medium';
  let taskDueDate = '';
  let isSubmitting = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.position = 'fixed';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.right = '0';
  backdrop.style.bottom = '0';
  backdrop.style.zIndex = '50';
  backdrop.style.backgroundColor = 'rgba(5, 8, 15, 0.8)';
  backdrop.style.backdropFilter = 'blur(8px)';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.padding = '1rem';
  backdrop.onclick = onClose;

  const dialog = document.createElement('div');
  dialog.role = 'dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.className = 'card animate-fade-in';
  dialog.style.width = '100%';
  dialog.style.maxWidth = '560px';
  dialog.style.backgroundColor = 'var(--bg-modal)';
  dialog.style.borderColor = 'var(--border-card)';
  dialog.style.boxShadow = 'var(--shadow-modal)';
  dialog.style.maxHeight = '90vh';
  dialog.style.display = 'flex';
  dialog.style.flexDirection = 'column';
  dialog.style.position = 'relative';
  dialog.onclick = (e) => e.stopPropagation();

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'flex-start';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = '1.25rem';

  const h2 = document.createElement('h2');
  h2.textContent = 'Quick-add academic task';
  h2.style.fontSize = '1.25rem';
  h2.style.fontWeight = '700';
  h2.style.color = 'var(--text-main)';
  const p = document.createElement('p');
  p.textContent = 'Add a task with priority, category, and due date.';
  p.style.fontSize = '0.875rem';
  p.style.color = 'var(--text-muted)';
  p.style.marginTop = '0.25rem';
  header.appendChild(h2);
  header.appendChild(p);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.onclick = onClose;
  closeBtn.className = 'btn btn-outline btn-icon';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'var(--text-dim)';
  closeBtn.style.cursor = 'pointer';
  const xIcon = document.createElement('span');
  xIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  closeBtn.appendChild(xIcon);
  header.appendChild(closeBtn);

  const content = document.createElement('div');
  content.style.overflowY = 'auto';
  content.style.flex = '1';
  content.style.paddingRight = '0.25rem';

  const form = document.createElement('form');
  form.className = 'dashboard-quick-form';
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    isSubmitting = true;
    renderForm();
    try {
      await api.createTask({
        title: taskTitle.trim(),
        category: taskCategory,
        priority: taskPriority,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });
      onClose();
      if (onTaskCreated) onTaskCreated();
    } catch (err) {
      console.error(err);
    } finally {
      isSubmitting = false;
      renderForm();
    }
  };

  const field1 = document.createElement('div');
  field1.className = 'dashboard-form-field';
  const label1 = document.createElement('label');
  label1.className = 'label';
  label1.htmlFor = 'quickTitle';
  label1.textContent = 'Task title *';
  const input1 = document.createElement('input');
  input1.id = 'quickTitle';
  input1.required = true;
  input1.className = 'input';
  input1.placeholder = 'e.g., Read CS301 Lecture 4 slides';
  input1.value = taskTitle;
  input1.oninput = (e) => { taskTitle = e.target.value; };
  field1.appendChild(label1);
  field1.appendChild(input1);

  const row = document.createElement('div');
  row.className = 'dashboard-form-row';

  const field2 = document.createElement('div');
  field2.className = 'dashboard-form-field';
  const label2 = document.createElement('label');
  label2.className = 'label';
  label2.htmlFor = 'quickCategory';
  label2.textContent = 'Category';
  const select1 = document.createElement('select');
  select1.id = 'quickCategory';
  select1.className = 'input';
  select1.value = taskCategory;
  select1.onchange = (e) => { taskCategory = e.target.value; };
  ['Assignment', 'Exam Prep', 'Project', 'Placement', 'General'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select1.appendChild(opt);
  });
  field2.appendChild(label2);
  field2.appendChild(select1);

  const field3 = document.createElement('div');
  field3.className = 'dashboard-form-field';
  const label3 = document.createElement('label');
  label3.className = 'label';
  label3.htmlFor = 'quickPriority';
  label3.textContent = 'Priority';
  const select2 = document.createElement('select');
  select2.id = 'quickPriority';
  select2.className = 'input';
  select2.value = taskPriority;
  select2.onchange = (e) => { taskPriority = e.target.value; };
  ['Low', 'Medium', 'High', 'Urgent'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select2.appendChild(opt);
  });
  field3.appendChild(label3);
  field3.appendChild(select2);
  row.appendChild(field2);
  row.appendChild(field3);

  const field4 = document.createElement('div');
  field4.className = 'dashboard-form-field';
  const label4 = document.createElement('label');
  label4.className = 'label';
  label4.htmlFor = 'quickDueDate';
  label4.textContent = 'Due date & time (optional)';
  const input2 = document.createElement('input');
  input2.id = 'quickDueDate';
  input2.type = 'datetime-local';
  input2.className = 'input';
  input2.value = taskDueDate;
  input2.oninput = (e) => { taskDueDate = e.target.value; };
  field4.appendChild(label4);
  field4.appendChild(input2);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'dashboard-form-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-outline';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = onClose;
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? 'Creating…' : 'Create task';
  actionsDiv.appendChild(cancelBtn);
  actionsDiv.appendChild(submitBtn);

  form.appendChild(field1);
  form.appendChild(row);
  form.appendChild(field4);
  form.appendChild(actionsDiv);

  content.appendChild(form);
  dialog.appendChild(header);
  dialog.appendChild(content);
  backdrop.appendChild(dialog);

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); cleanup(); }
  };
  window.addEventListener('keydown', handleKeyDown);

  function renderForm() {
    // Re-render to reflect isSubmitting state
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Creating…' : 'Create task';
  }

  return { element: backdrop, cleanup };
}
