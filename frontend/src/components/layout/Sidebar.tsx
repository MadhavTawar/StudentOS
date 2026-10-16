import React from 'react';
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
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  unreadNotifsCount?: number;
  pendingProposalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ unreadNotifsCount = 0, pendingProposalsCount = 0 }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Tasks', path: '/tasks', icon: <CheckSquare size={18} /> },
    { name: 'Deadlines', path: '/deadlines', icon: <Calendar size={18} /> },
    { name: 'Inbox', path: '/inbox', icon: <Mail size={18} /> },
    {
      name: 'AI Assistant',
      path: '/assistant',
      icon: <Bot size={18} />,
      badge: pendingProposalsCount > 0 ? `${pendingProposalsCount}` : undefined
    },
    {
      name: 'Reminders',
      path: '/reminders',
      icon: <Bell size={18} />,
      badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined
    },
    { name: 'Settings & Privacy', path: '/settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <GraduationCap size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Student<span style={{ color: 'var(--accent-primary)' }}>OS</span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em' }}>
            ACADEMIC SUITE
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
              border: isActive ? '1px solid var(--border-card)' : '1px solid transparent',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'inherit' }}>{item.icon}</span>
              <span>{item.name}</span>
            </div>
            {item.badge && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Assistant Banner Footer */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-card)' }}>
        <div
          style={{
            padding: '0.875rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Sparkles size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>AI Guardrails Active</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
            Read-only email analysis. Human approval required for all actions.
          </p>
        </div>
      </div>
    </aside>
  );
};
