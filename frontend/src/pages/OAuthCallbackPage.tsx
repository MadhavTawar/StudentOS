import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');
  const googleError = params.get('error');
  const error = callbackError
    ?? (googleError
      ? `Google authorization was not completed: ${googleError}`
      : !code || !state
        ? 'Google did not return the required authorization details. Please try connecting again.'
        : null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (googleError || !code || !state) return;

    api.sendGmailCallback(code, state)
      .then(() => navigate('/app/inbox', { replace: true }))
      .catch((callbackError: Error) => {
        setCallbackError(callbackError.message || 'Could not connect your Gmail account.');
      });
  }, [location.search, navigate, code, state, googleError]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: 'var(--bg-main)', padding: '2rem' }}>
      <section style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 700 }}>
          {error ? 'Gmail connection failed' : 'Connecting Gmail…'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          {error || 'Completing secure read-only authorization.'}
        </p>
        {error && (
          <Link to="/app/inbox" style={{ display: 'inline-block', marginTop: '1.25rem', color: 'var(--accent-primary)' }}>
            Return to your inbox
          </Link>
        )}
      </section>
    </main>
  );
};
