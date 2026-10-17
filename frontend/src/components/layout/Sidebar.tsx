import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Mail,
  Bot,
  Bell,
  Settings,
  GraduationCap,
  Sparkles,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
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
  useEffect(() => {
    let isCurrent = true;
    api.getKnowledgeAccess()
      .then((access) => {
        if (isCurrent) {
          setShowDocumentDesk(access.can_manage_documents || access.admin_bootstrap_available);
        }
      })
      .catch((error: unknown) => {
        console.error('Could not load institute document access.', error);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const navItems = [
    { name: 'Study desk', path: '/', icon: <LayoutDashboard size={19} /> },
    { name: 'Coursework', path: '/tasks', icon: <CheckSquare size={19} /> },
    { name: 'Calendar', path: '/deadlines', icon: <Calendar size={19} /> },
    { name: 'Inbox', path: '/inbox', icon: <Mail size={19} /> },
    { name: 'Institute library', path: '/knowledge', icon: <BookOpen size={19} /> },
    ...(showDocumentDesk
      ? [{ name: 'Document desk', path: '/knowledge/manage', icon: <BookOpen size={19} /> }]
      : []),
    {
      name: 'Study guide',
      path: '/assistant',
      icon: <Bot size={19} />,
      badge: pendingProposalsCount > 0 ? `${pendingProposalsCount}` : undefined,
    },
    {
      name: 'Reminders',
      path: '/reminders',
      icon: <Bell size={19} />,
      badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
    },
    { name: 'Preferences', path: '/settings', icon: <Settings size={19} /> },
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
          <div className="sidebar-brand-caption">CAMPUS FIELD NOTES</div>
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

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">YOUR STUDY DESK</span>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
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
