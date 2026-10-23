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
    <main className="public-centered-page">
      <section className="card public-centered-card">
        <span className="sidebar-section-label">STUDENTOS WORKSPACE</span>
        <h1 className="page-title page-title-dark">
          {isAuthenticated ? 'Joining workspace…' : 'You’re invited'}
        </h1>
        <p className="page-description public-card-copy">
          Sign in or create an account to accept this one-time invitation. Anyone with the link can join, so only share it with people you trust.
        </p>
        {displayedError && <p role="alert" className="form-error">{displayedError}</p>}
        {token && !isAuthenticated && !isLoading && (
          <div className="public-center-actions">
            <Link className="btn btn-primary" to={`/register?invite=${encodedInvite}`}>Create account</Link>
            <Link className="btn btn-outline" to={`/login?invite=${encodedInvite}`}>Sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
};
