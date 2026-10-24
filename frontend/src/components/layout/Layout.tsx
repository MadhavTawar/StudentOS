import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { TopBar } from './TopBar';
import { api } from '../../lib/api';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();
  const isWorkspaceShell =
    pathname.startsWith('/app/knowledge') ||
    pathname.startsWith('/app/assistant') ||
    pathname.startsWith('/app/learn');

  useEffect(() => {
    if (!isAuthenticated) {
      document.documentElement.dataset.theme = 'light';
      return;
    }
    let isCurrent = true;
    void api.getPreferences()
      .then((preferences) => {
        if (isCurrent) {
          const resolved = preferences.theme === 'dark' ? 'dark' : 'light';
          document.documentElement.dataset.theme = resolved;
          try { localStorage.setItem('studentos-theme', resolved); } catch {}
        }
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
      <div className="app-content">
        <TopBar />
        <main className="app-main">
          <div className="app-main-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
