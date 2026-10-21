import React from 'react';
import { TaskPriority } from '../../types';

export const PriorityBadge: React.FC<{ priority: TaskPriority | string }> = ({ priority }) => {
  const norm = (priority || '').toLowerCase();
  let className = 'badge-medium';
  if (norm === 'urgent') className = 'badge-urgent';
  else if (norm === 'high') className = 'badge-high';
  else if (norm === 'low') className = 'badge-low';

  return <span className={`badge ${className}`}>{priority}</span>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = (status || '').toLowerCase();
  let className = 'badge-status-upcoming';
  if (norm === 'completed') className = 'badge-status-completed';
  else if (norm === 'overdue') className = 'badge-status-overdue';

  return <span className={`badge ${className}`}>{status}</span>;
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  return (
    <span
      className="badge"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-card)',
      }}
    >
      {category}
    </span>
  );
};
