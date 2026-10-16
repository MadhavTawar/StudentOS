import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar />
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
