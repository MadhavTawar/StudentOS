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
    <main className="public-centered-page oauth-page">
      <section className="public-status-card">
        <h1 className="page-title page-title-dark">
          {error ? 'Gmail connection failed' : 'Connecting Gmail…'}
        </h1>
        <p className="page-description">
          {error || 'Completing secure read-only authorization.'}
        </p>
        {error && (
          <Link to="/app/inbox" className="text-link oauth-return-link">
            Return to your inbox
          </Link>
        )}
      </section>
    </main>
  );
};
