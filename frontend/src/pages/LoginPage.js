import { auth } from '../auth.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';

export function render() {
  const container = document.createElement('div');
  container.className = 'login-screen';

  const card = document.createElement('div');
  card.className = 'card login-card animate-fade-in login-card';

  const brand = document.createElement('div');
  brand.className = 'login-brand';
  const logo = document.createElement('div');
  logo.className = 'login-logo';
  logo.appendChild(icon('graduation'));
  const title = document.createElement('h1');
  title.className = 'login-title';
  title.textContent = 'Welcome back to Student';
  const accent = document.createElement('span');
  accent.className = 'login-accent';
  accent.textContent = 'OS';
  title.appendChild(accent);
  const subtitle = document.createElement('p');
  subtitle.className = 'login-subtitle';
  subtitle.textContent = 'Sign in to your personal workspace';
  brand.appendChild(logo);
  brand.appendChild(title);
  brand.appendChild(subtitle);

  const form = document.createElement('form');
  form.className = 'login-form';

  const emailField = document.createElement('div');
  const emailLabel = document.createElement('label');
  emailLabel.className = 'label';
  emailLabel.htmlFor = 'email';
  emailLabel.textContent = 'Email address';
  const emailWrapper = document.createElement('div');
  emailWrapper.className = 'login-input-wrapper';
  const emailInput = document.createElement('input');
  emailInput.id = 'email';
  emailInput.type = 'email';
  emailInput.required = true;
  emailInput.className = 'input login-input';
  emailInput.placeholder = 'you@example.com';
  const mailIcon = icon('mail');
  mailIcon.className = 'login-input-icon';
  emailWrapper.appendChild(emailInput);
  emailWrapper.appendChild(mailIcon);
  emailField.appendChild(emailLabel);
  emailField.appendChild(emailWrapper);

  const passField = document.createElement('div');
  const passLabel = document.createElement('label');
  passLabel.className = 'label';
  passLabel.htmlFor = 'password';
  passLabel.textContent = 'Password';
  const passWrapper = document.createElement('div');
  passWrapper.className = 'login-input-wrapper';
  const passInput = document.createElement('input');
  passInput.id = 'password';
  passInput.type = 'password';
  passInput.required = true;
  passInput.className = 'input login-input';
  passInput.placeholder = '••••••••';
  const lockIcon = icon('lock');
  lockIcon.className = 'login-input-icon';
  passWrapper.appendChild(passInput);
  passWrapper.appendChild(lockIcon);
  passField.appendChild(passLabel);
  passField.appendChild(passWrapper);

  const submitBtn = Button({
    children: 'Sign In ',
    variant: 'primary',
    className: 'login-submit-btn',
  });
  submitBtn.appendChild(icon('arrowRight'));

  form.appendChild(emailField);
  form.appendChild(passField);
  form.appendChild(submitBtn);

  const footer = document.createElement('div');
  footer.className = 'login-footer';
  const footerText = document.createElement('p');
  footerText.className = 'login-footer-text';
  footerText.textContent = "Don't have an account? ";
  const createLink = document.createElement('a');
  createLink.className = 'login-footer-link';
  createLink.href = '/register';
  createLink.textContent = 'Create an account';
  createLink.onclick = (e) => { e.preventDefault(); router.navigate('/register'); };
  footerText.appendChild(createLink);
  footer.appendChild(footerText);

  card.appendChild(brand);
  card.appendChild(form);
  card.appendChild(footer);

  let errorEl = null;

  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get('invite');

  async function handleSubmit(e) {
    e.preventDefault();
    if (errorEl) { errorEl.remove(); errorEl = null; }
    const email = emailInput.value;
    const password = passInput.value;
    submitBtn.disabled = true;
    try {
      await auth.login(email, password);
      if (inviteToken) {
        await api.acceptWorkspaceInvitation(inviteToken);
        router.navigate('/app/workspaces');
      } else {
        router.navigate('/app');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please verify your credentials.';
      errorEl = document.createElement('div');
      errorEl.className = 'login-error';
      errorEl.appendChild(icon('alertCircle'));
      const span = document.createElement('span');
      span.textContent = msg;
      errorEl.appendChild(span);
      form.insertBefore(errorEl, form.firstChild);
    } finally {
      submitBtn.disabled = false;
    }
  }

  form.addEventListener('submit', handleSubmit);

  container.appendChild(card);
  return container;
}
