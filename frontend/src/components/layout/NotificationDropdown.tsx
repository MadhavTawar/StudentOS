import React from 'react';
import { Check, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { InAppNotification } from '../../types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
        onClick={onClose}
      />
      <div
        className="card animate-fade-in"
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '360px',
          maxHeight: '440px',
          overflowY: 'auto',
          zIndex: 50,
          padding: '0.75rem',
          backgroundColor: 'var(--bg-modal)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.5rem',
            marginBottom: '0.5rem',
            borderBottom: '1px solid var(--border-card)',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Notifications ({notifications.filter((n) => !n.is_read).length} new)
          </span>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
            No active reminders or notifications
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid',
                  borderColor: n.is_read ? 'var(--border-subtle)' : 'rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  gap: '0.625rem',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ marginTop: '2px', color: 'var(--accent-warning)', flexShrink: 0 }}>
                  <AlertCircle size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {!n.is_read && (
                    <button
                      title="Mark as read"
                      onClick={() => onMarkRead(n.id)}
                      className="btn btn-outline btn-icon btn-sm"
                      style={{ padding: '4px', border: 'none', color: 'var(--accent-success)' }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    title="Dismiss"
                    onClick={() => onDismiss(n.id)}
                    className="btn btn-outline btn-icon btn-sm"
                    style={{ padding: '4px', border: 'none', color: 'var(--text-dim)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
