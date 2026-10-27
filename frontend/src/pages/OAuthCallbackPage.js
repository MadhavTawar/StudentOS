import { api } from '../api.js';
import { router } from '../router.js';

export function render() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const googleError = params.get('error');

  let error = null;
  if (googleError) {
    error = `Google authorization was not completed: ${googleError}`;
  } else if (!code || !state) {
    error = 'Google did not return the required authorization details. Please try connecting again.';
  }

  const main = document.createElement('main');
  main.className = 'public-centered-page oauth-page';

  const card = document.createElement('section');
  card.className = 'public-status-card';

  const h1 = document.createElement('h1');
  h1.className = 'page-title page-title-dark';
  h1.textContent = error ? 'Gmail connection failed' : 'Connecting Gmail…';
  card.appendChild(h1);

  const p = document.createElement('p');
  p.className = 'page-description';
  p.textContent = error || 'Completing secure read-only authorization.';
  card.appendChild(p);

  if (error) {
    const link = document.createElement('a');
    link.className = 'text-link oauth-return-link';
    link.href = '/app/inbox';
    link.textContent = 'Return to your inbox';
    link.onclick = (e) => { e.preventDefault(); router.navigate('/app/inbox'); };
    card.appendChild(link);
  }

  main.appendChild(card);

  if (!error && code && state) {
    api.sendGmailCallback(code, state)
      .then(() => router.navigate('/app/inbox', { replace: true }))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Could not connect your Gmail account.';
        const errDiv = document.createElement('div');
        errDiv.className = 'form-error';
        errDiv.setAttribute('role', 'alert');
        errDiv.textContent = msg;
        card.appendChild(errDiv);
      });
  }

  return main;
}
