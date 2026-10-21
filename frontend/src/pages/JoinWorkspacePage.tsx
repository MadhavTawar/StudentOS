import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';

export const JoinWorkspacePage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);
  const token = searchParams.get('token') ?? '';
  const encodedInvite = encodeURIComponent(token);
  const displayedError = error || (!token ? 'This invitation link is missing its token.' : '');

  useEffect(() => {
    if (isLoading || !isAuthenticated || handled.current) return;
    if (!token) return;
    handled.current = true;
    api.acceptWorkspaceInvitation(token)
      .then((workspace) => {
        api.setWorkspaceId(workspace.id);
        navigate('/app/workspaces', { replace: true });
      })
      .catch((joinError: unknown) => {
        setError(joinError instanceof Error ? joinError.message : 'Could not accept this invitation.');
      });
  }, [isAuthenticated, isLoading, navigate, token]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main)', padding: '1.5rem' }}>
      <section className="card" style={{ width: 'min(100%, 440px)', padding: '2rem' }}>
        <span className="sidebar-section-label">STUDENTOS WORKSPACE</span>
        <h1 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          {isAuthenticated ? 'Joining workspace…' : 'You’re invited'}
        </h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Sign in or create an account to accept this one-time invitation. Anyone with the link can join, so only share it with people you trust.
        </p>
        {displayedError && <p role="alert" style={{ color: '#fca5a5' }}>{displayedError}</p>}
        {token && !isAuthenticated && !isLoading && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to={`/register?invite=${encodedInvite}`}>Create account</Link>
            <Link className="btn btn-outline" to={`/login?invite=${encodedInvite}`}>Sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
};
