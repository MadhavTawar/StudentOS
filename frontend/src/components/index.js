import { icon } from '../icons.js';

export function Button(props = {}) {
  const {
    children = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    type = 'button',
    onClick,
    icon: iconName,
  } = props;

  const sizeClasses = { sm: 'btn-sm', md: '', lg: 'text-base py-3 px-5' }[size] || '';

  const btn = document.createElement('button');
  btn.type = type;
  btn.className = `btn btn-${variant} ${sizeClasses} ${className}`.trim();
  btn.disabled = disabled || isLoading;
  btn.ariaBusy = isLoading || undefined;
  if (onClick) btn.addEventListener('click', (e) => onClick(e));

  if (isLoading) {
    btn.appendChild(icon('loader2'));
  } else if (iconName) {
    const span = document.createElement('span');
    span.className = 'shrink-0';
    span.appendChild(icon(iconName));
    btn.appendChild(span);
  }
  if (children) {
    const text = document.createTextNode(children);
    btn.appendChild(text);
  }

  return btn;
}

export function Badge({ type, label }) {
  const className = `badge badge-${type}`;
  const el = document.createElement('span');
  el.className = className;
  el.textContent = label;
  return el;
}

export const PriorityBadge = ({ priority }) => Badge({ type: String(priority || '').toLowerCase(), label: priority });
export const StatusBadge = ({ status }) => Badge({ type: String(status || '').toLowerCase(), label: status });
export const CategoryBadge = ({ category }) => Badge({ type: 'category', label: category });

export function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

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
  dialog.style.maxWidth = maxWidth === 'max-w-lg' ? '560px' : maxWidth === 'max-w-2xl' ? '720px' : '480px';
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

  const titleDiv = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = title;
  h2.style.fontSize = '1.25rem';
  h2.style.fontWeight = '700';
  h2.style.color = 'var(--text-main)';
  titleDiv.appendChild(h2);
  if (description) {
    const p = document.createElement('p');
    p.textContent = description;
    p.style.fontSize = '0.875rem';
    p.style.color = 'var(--text-muted)';
    p.style.marginTop = '0.25rem';
    titleDiv.appendChild(p);
  }
  header.appendChild(titleDiv);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.onclick = onClose;
  closeBtn.className = 'btn btn-outline btn-icon';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'var(--text-dim)';
  closeBtn.style.cursor = 'pointer';
  closeBtn.appendChild(icon('x'));
  header.appendChild(closeBtn);

  const content = document.createElement('div');
  content.style.overflowY = 'auto';
  content.style.flex = '1';
  content.style.paddingRight = '0.25rem';
  if (children instanceof Node) {
    content.appendChild(children);
  } else if (typeof children === 'string') {
    content.innerHTML = children;
  }

  dialog.appendChild(header);
  dialog.appendChild(content);
  backdrop.appendChild(dialog);

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      cleanup();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  return backdrop;
}

export function EmptyState({ icon: iconEl, title, description, action }) {
  const section = document.createElement('section');
  section.className = 'empty-state';
  section.setAttribute('aria-live', 'polite');

  const iconDiv = document.createElement('div');
  iconDiv.className = 'empty-state-icon';
  iconDiv.setAttribute('aria-hidden', 'true');
  if (iconEl instanceof Node) iconDiv.appendChild(iconEl);
  section.appendChild(iconDiv);

  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  const p = document.createElement('p');
  p.textContent = description;
  section.appendChild(p);

  if (action) {
    const actionDiv = document.createElement('div');
    actionDiv.className = 'empty-state-action';
    if (action instanceof Node) actionDiv.appendChild(action);
    section.appendChild(actionDiv);
  }

  return section;
}

export function LoadingSkeleton({ rows = 3, height = '48px' } = {}) {
  const div = document.createElement('div');
  div.className = 'loading-skeleton';
  div.setAttribute('aria-label', 'Loading');
  div.setAttribute('role', 'status');
  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.className = 'loading-skeleton-row animate-pulse-glow';
    row.style.height = height;
    div.appendChild(row);
  }
  return div;
}
