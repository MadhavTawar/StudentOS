import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Mail,
  Bot,
  Bell,
  Settings,
  GraduationCap,
  Sparkles,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';

interface SidebarProps {
  unreadNotifsCount?: number;
  pendingProposalsCount?: number;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadNotifsCount = 0,
  pendingProposalsCount = 0,
  mobileOpen,
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showDocumentDesk, setShowDocumentDesk] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; is_personal: boolean }[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(api.getWorkspaceId() ?? '');
  const navigate = useNavigate();
  useEffect(() => {
    let isCurrent = true;
    Promise.all([api.listWorkspaces(), api.getKnowledgeAccess()])
      .then(([availableWorkspaces, access]) => {
        if (isCurrent) {
          setWorkspaces(availableWorkspaces);
          setActiveWorkspaceId(api.getWorkspaceId() ?? availableWorkspaces.find((item) => item.is_personal)?.id ?? '');
          setShowDocumentDesk(access.can_manage_documents);
        }
      })
      .catch((error: unknown) => {
        console.error('Could not load workspace access.', error);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    api.setWorkspaceId(workspaceId);
    navigate('/app/knowledge');
  };

  const navItems = [
    { name: 'Study desk', path: '/app', icon: <LayoutDashboard size={19} /> },
    { name: 'Planner', path: '/app/planner', icon: <CheckSquare size={19} /> },
    { name: 'Inbox', path: '/app/inbox', icon: <Mail size={19} /> },
    { name: 'Shared library', path: '/app/knowledge', icon: <BookOpen size={19} /> },
    ...(showDocumentDesk
      ? [{ name: 'Library manager', path: '/app/knowledge/manage', icon: <BookOpen size={19} /> }]
      : []),
    {
      name: 'Study guide',
      path: '/app/assistant',
      icon: <Bot size={19} />,
      badge: pendingProposalsCount > 0 ? `${pendingProposalsCount}` : undefined,
    },
    {
      name: 'Reminders',
      path: '/app/reminders',
      icon: <Bell size={19} />,
      badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
    },
    { name: 'Preferences', path: '/app/settings', icon: <Settings size={19} /> },
    { name: 'Workspaces', path: '/app/workspaces', icon: <Users size={19} /> },
    { name: 'Plan & billing', path: '/app/billing', icon: <Sparkles size={19} /> },
  ];

  return (
    <aside
      id="studentos-navigation"
      className={`app-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <GraduationCap size={22} />
        </div>
        <div className="sidebar-brand-copy">
          <div className="sidebar-brand-name">
            Student<span>OS</span>
          </div>
          <div className="sidebar-brand-caption">YOUR STUDY WORKSPACE</div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {!collapsed && workspaces.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-card)' }}>
          <label htmlFor="workspace-switcher" className="sidebar-section-label">ACTIVE WORKSPACE</label>
          <select
            id="workspace-switcher"
            className="input"
            value={activeWorkspaceId}
            onChange={(event) => handleWorkspaceChange(event.target.value)}
            style={{ marginTop: '0.4rem', fontSize: '0.8125rem', padding: '0.55rem' }}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.is_personal ? 'Personal · ' : ''}{workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">YOUR STUDY DESK</span>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app'}
            onClick={onNavigate}
            title={collapsed ? item.name : undefined}
            className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.name}</span>
            {item.badge && <span className="sidebar-link-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-guardrail-card">
          <div className="sidebar-guardrail-title">
            <Sparkles size={16} />
            <span>AI guardrails active</span>
          </div>
          <p>Read-only email analysis. You stay in control of every action.</p>
        </div>
      </div>
    </aside>
  );
};
