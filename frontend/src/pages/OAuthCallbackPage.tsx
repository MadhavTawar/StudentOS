import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const googleError = params.get('error');

    if (googleError) {
      setError(`Google authorization was not completed: ${googleError}`);
      return;
    }

    if (!code || !state) {
      setError('Google did not return the required authorization details. Please try connecting again.');
      return;
    }

    api.sendGmailCallback(code, state)
      .then(() => navigate('/inbox', { replace: true }))
      .catch((callbackError: Error) => {
        setError(callbackError.message || 'Could not connect your Gmail account.');
      });
  }, [location.search, navigate]);

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
          <Link to="/inbox" style={{ display: 'inline-block', marginTop: '1.25rem', color: 'var(--accent-primary)' }}>
            Return to your inbox
          </Link>
        )}
      </section>
    </main>
  );
};
