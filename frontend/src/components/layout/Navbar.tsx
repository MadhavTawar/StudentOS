import React, { useCallback, useState, useEffect } from 'react';
import { Bell, GraduationCap, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { api } from '../../lib/api';
import { InAppNotification } from '../../types';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  isWorkspaceShell?: boolean;
}

const primaryLinks = [
  { label: 'Study desk', to: '/app', end: true },
  { label: 'Planner', to: '/app/planner' },
  { label: 'Goals', to: '/app/goals' },
  { label: 'Inbox', to: '/app/inbox' },
  { label: 'Study guide', to: '/app/assistant' },
  { label: 'Shared library', to: '/app/knowledge' },
  { label: 'Reminders', to: '/app/reminders' },
  { label: 'Workspaces', to: '/app/workspaces' },
  { label: 'Preferences', to: '/app/settings' },
  { label: 'Plan & billing', to: '/app/billing' },
];

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isMenuOpen = false, isWorkspaceShell = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDate] = useState(() => new Date());
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; is_personal: boolean }[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(api.getWorkspaceId() ?? '');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch {
      // Ignore background fetch failure
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchNotifications);
    const interval = setInterval(fetchNotifications, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    let isCurrent = true;
    api.listWorkspaces()
      .then((availableWorkspaces) => {
        if (!isCurrent) return;
        setWorkspaces(availableWorkspaces);
        setActiveWorkspaceId(api.getWorkspaceId() ?? availableWorkspaces.find((workspace) => workspace.is_personal)?.id ?? '');
      })
      .catch(() => {
        // Workspace access is also available from the workspace sidebar.
      });
    return () => {
      isCurrent = false;
    };
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
      className="app-topbar"
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
      <NavLink className="topbar-brand" to="/app" aria-label="StudentOS study desk">
        <span className="topbar-brand-mark"><GraduationCap size={19} /></span>
        <span>Student<span>OS</span></span>
      </NavLink>
      {!isWorkspaceShell && (
        <nav className="topbar-navigation" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
      {!isWorkspaceShell && workspaces.length > 0 && (
        <label className="topbar-workspace-control">
          <span className="sr-only">Active workspace</span>
          <select
            aria-label="Active workspace"
            value={activeWorkspaceId}
            onChange={(event) => {
              const workspaceId = event.target.value;
              setActiveWorkspaceId(workspaceId);
              api.setWorkspaceId(workspaceId);
              navigate('/app/knowledge');
            }}
          >
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.is_personal ? 'Personal · ' : ''}{workspace.name}</option>)}
          </select>
        </label>
      )}
      <div className="topbar-date">
        <span>FIELD NOTES / TODAY</span>
        <time dateTime={currentDate.toISOString()}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </time>
      </div>

      {/* Right Controls */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        {/* Notification Bell */}
        <div className="notification-control" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="btn btn-outline btn-icon"
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            aria-haspopup="menu"
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
          className="topbar-account"
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
          type="button"
          onClick={logout}
          className="btn btn-outline btn-sm"
          aria-label="Sign out"
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
