import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { InAppNotification } from '../../types';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isMenuOpen = false }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch {
      // Ignore background fetch failure
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header
      style={{
        height: '58px',
        backgroundColor: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-card)',
        padding: '0 1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        className="mobile-menu-button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-expanded={isMenuOpen}
        aria-controls="studentos-navigation"
      >
        <Menu size={20} />
      </button>
      <div className="topbar-date">
        <span>FIELD NOTES / TODAY</span>
        <time dateTime={new Date().toISOString()}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </time>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="btn btn-outline btn-icon"
            title="Notifications"
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-full)',
              color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderColor: unreadCount > 0 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-card)',
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-danger)',
                }}
              />
            )}
          </button>

          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onDismiss={handleDismiss}
          />
        </div>

        {/* User Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
            }}
          >
            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={14} />}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {user?.full_name || user?.email}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn btn-outline btn-sm"
          title="Sign out"
          style={{ color: 'var(--text-dim)', borderColor: 'var(--border-card)' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
