import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { api } from '../../lib/api';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isWorkspaceShell = pathname.startsWith('/app/knowledge') || pathname.startsWith('/app/assistant');

  useEffect(() => {
    if (!isSidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      document.documentElement.dataset.theme = 'light';
      return;
    }
    let isCurrent = true;
    void api.getPreferences()
      .then((preferences) => {
        if (isCurrent) document.documentElement.dataset.theme = preferences.theme === 'dark' ? 'dark' : 'light';
      })
      .catch(() => {
        if (isCurrent) document.documentElement.dataset.theme = 'light';
      });
    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-main)',
          padding: '2rem',
        }}
      >
        <div style={{ width: '320px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
            StudentOS
          </div>
          <LoadingSkeleton rows={3} height="20px" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`app-shell${isWorkspaceShell ? ' app-shell-workspace' : ' app-shell-study'}`}>
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar mobileOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />

      <div className="app-content">
        <Navbar
          onMenuClick={() => setIsSidebarOpen(true)}
          isMenuOpen={isSidebarOpen}
          isWorkspaceShell={isWorkspaceShell}
        />
        <main className="app-main">
          <div className="app-main-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
