import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { api } from '../../lib/api';
import { InAppNotification, Workspace } from '../../types';
import { NotificationDropdown } from './NotificationDropdown';

const primaryLinks = [
  { label: 'Dashboard', to: '/app', end: true },
  { label: 'Planner', to: '/app/planner' },
  { label: 'Goals', to: '/app/goals' },
  { label: 'Inbox', to: '/app/inbox' },
  { label: 'Learn', to: '/app/learn' },
];

const accountMenuItems = [
  { label: 'Reminders', to: '/app/reminders', icon: <Bell size={16} /> },
  { label: 'Study guide', to: '/app/assistant', icon: <GraduationCap size={16} /> },
  { label: 'Study groups', to: '/app/workspaces', icon: <UserIcon size={16} /> },
  { label: 'Settings', to: '/app/settings', icon: <UserIcon size={16} /> },
  { label: 'Plan & billing', to: '/app/billing', icon: <UserIcon size={16} /> },
];

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(api.getWorkspaceId() ?? '');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    let isCurrent = true;
    api.listWorkspaces()
      .then((availableWorkspaces) => {
        if (isCurrent) {
          setWorkspaces(availableWorkspaces);
          setActiveWorkspaceId(api.getWorkspaceId() ?? availableWorkspaces.find((w) => w.is_personal)?.id ?? '');
        }
      })
      .catch(() => {});
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

  const handleWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    api.setWorkspaceId(workspaceId);
    navigate('/app/learn');
    setIsAccountOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/app/planner?q=${encodeURIComponent(q)}`);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  };

  const closeMenus = () => {
    setIsNotifOpen(false);
    setIsAccountOpen(false);
    setIsMenuOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') closeMenus();
  };

  const workspaceLabel = (workspace: Workspace) => {
    if (workspace.is_personal) return `Personal · ${workspace.name}`;
    return `Study group · ${workspace.name}`;
  };

  return (
    <header
      className="topbar"
      onKeyDown={handleKeyDown}
    >
      <div className="topbar-inner">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="topbar-drawer"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <NavLink
          className="topbar-brand"
          to="/app"
          aria-label="StudentOS study desk"
          onClick={closeMenus}
        >
          <span className="topbar-brand-mark"><GraduationCap size={19} /></span>
          <span>Student<span>OS</span></span>
        </NavLink>

        <nav className="topbar-navigation" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMenus}
              className={({ isActive }) => {
                const isLearnActive =
                  isActive ||
                  pathname.startsWith('/app/knowledge') ||
                  pathname.startsWith('/app/assistant');
                return `topbar-nav-link${isLearnActive ? ' is-active' : ''}`;
              }}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <form className="topbar-search" onSubmit={handleSearchSubmit}>
          <Search size={16} className="topbar-search-icon" />
          <input
            className="input topbar-search-input"
            placeholder="Search tasks"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>

        <div className="topbar-actions">
          <div className="notification-control">
            <button
              type="button"
              onClick={() => setIsNotifOpen((open) => !open)}
              className={`btn btn-outline btn-icon${unreadCount > 0 ? ' is-unread' : ''}`}
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
              aria-haspopup="menu"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="topbar-notif-dot"
                  aria-label={`${unreadCount} unread notifications`}
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

          <div
            className="topbar-account"
            onClick={() => setIsAccountOpen((open) => !open)}
            aria-label="Account menu"
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsAccountOpen((open) => !open);
              }
            }}
          >
            <div className="avatar">
              {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={14} />}
            </div>
            <span className="topbar-account-name">{user?.full_name || user?.email}</span>
            <ChevronDown size={14} className="topbar-account-chevron" />
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <div
            className="topbar-drawer-backdrop"
            onClick={() => setIsMenuOpen(false)}
            onKeyDown={handleKeyDown}
          />
          <nav
            className="topbar-drawer"
            aria-label="Navigation menu"
            onKeyDown={handleKeyDown}
          >
            <div className="topbar-drawer-header">
              <span className="topbar-brand-mark"><GraduationCap size={19} /></span>
              <span>StudentOS</span>
              <button
                type="button"
                className="topbar-drawer-close"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="topbar-drawer-nav" aria-label="Main navigation">
              {primaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `topbar-drawer-link${isActive ? ' is-active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="topbar-drawer-section">
              <h3 className="topbar-drawer-section-title">Account</h3>
              {accountMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="topbar-drawer-link"
                >
                  {item.icon} {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                className="topbar-drawer-link topbar-drawer-link-danger"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </nav>
        </>
      )}

      {isAccountOpen && (
        <>
          <div
            className="topbar-account-backdrop"
            onClick={() => setIsAccountOpen(false)}
            onKeyDown={handleKeyDown}
          />
          <div
            className={`topbar-account-menu${isAccountOpen ? ' is-open' : ''}`}
            onKeyDown={handleKeyDown}
          >
            <div className="topbar-account-menu-header">
              <div className="avatar">{user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={20} />}</div>
              <div>
                <div className="topbar-account-menu-name">{user?.full_name || ''}</div>
                <div className="topbar-account-menu-email">{user?.email || ''}</div>
              </div>
            </div>
            {workspaces.length > 0 && (
              <div className="topbar-account-menu-section">
                <label className="topbar-account-menu-section-title">Workspace</label>
                <select
                  className="input topbar-account-menu-workspace"
                  value={activeWorkspaceId}
                  onChange={(event) => handleWorkspaceChange(event.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspaceLabel(workspace)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <nav className="topbar-account-menu-nav">
              {accountMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsAccountOpen(false)}
                  className="topbar-account-menu-link"
                >
                  {item.icon} {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                className="topbar-account-menu-link topbar-account-menu-link-danger"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Sign out
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};
