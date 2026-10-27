import { auth } from '../auth.js';
import { api } from '../api.js';
import { router } from '../router.js';

export function render() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const encodedInvite = encodeURIComponent(token);

  const main = document.createElement('main');
  main.className = 'public-centered-page';

  const card = document.createElement('section');
  card.className = 'card public-centered-card';

  const label = document.createElement('span');
  label.className = 'sidebar-section-label';
  label.textContent = 'STUDENTOS WORKSPACE';
  card.appendChild(label);

  const h1 = document.createElement('h1');
  h1.className = 'page-title page-title-dark';
  h1.textContent = auth.isAuthenticated ? 'Joining workspace…' : "You're invited";
  card.appendChild(h1);

  const desc = document.createElement('p');
  desc.className = 'page-description public-card-copy';
  desc.textContent = 'Sign in or create an account to accept this one-time invitation. Anyone with the link can join, so only share it with people you trust.';
  card.appendChild(desc);

  const displayedError = (!token ? 'This invitation link is missing its token.' : '');
  if (displayedError) {
    const err = document.createElement('p');
    err.setAttribute('role', 'alert');
    err.className = 'form-error';
    err.textContent = displayedError;
    card.appendChild(err);
  }

  if (token && !auth.isAuthenticated && !auth.isLoading) {
    const actions = document.createElement('div');
    actions.className = 'public-center-actions';
    const createAcct = document.createElement('a');
    createAcct.className = 'btn btn-primary';
    createAcct.href = `/register?invite=${encodedInvite}`;
    createAcct.textContent = 'Create account';
    createAcct.onclick = (e) => { e.preventDefault(); router.navigate(`/register?invite=${encodedInvite}`); };
    const signIn = document.createElement('a');
    signIn.className = 'btn btn-outline';
    signIn.href = `/login?invite=${encodedInvite}`;
    signIn.textContent = 'Sign in';
    signIn.onclick = (e) => { e.preventDefault(); router.navigate(`/login?invite=${encodedInvite}`); };
    actions.appendChild(createAcct);
    actions.appendChild(signIn);
    card.appendChild(actions);
  }

  main.appendChild(card);

  if (auth.isAuthenticated && token) {
    api.acceptWorkspaceInvitation(token)
      .then((workspace) => {
        api.setWorkspaceId(workspace.id);
        router.navigate('/app/workspaces', { replace: true });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Could not accept this invitation.';
        const errDiv = document.createElement('p');
        errDiv.setAttribute('role', 'alert');
        errDiv.className = 'form-error';
        errDiv.textContent = msg;
        card.appendChild(errDiv);
      });
  }

  return main;
}
