import { auth } from '../auth.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';

export function render() {
  const container = document.createElement('div');
  container.className = 'login-screen';

  const card = document.createElement('div');
  card.className = 'card login-card animate-fade-in register-card';

  const brand = document.createElement('div');
  brand.className = 'login-brand register-brand';
  const logo = document.createElement('div');
  logo.className = 'login-logo';
  logo.appendChild(icon('graduation'));
  const title = document.createElement('h1');
  title.className = 'login-title register-title';
  title.textContent = 'Create your ';
  const accent = document.createElement('span');
  accent.className = 'login-accent';
  accent.textContent = 'StudentOS';
  title.appendChild(accent);
  title.appendChild(document.createTextNode(' account'));
  const subtitle = document.createElement('p');
  subtitle.className = 'login-subtitle register-subtitle';
  subtitle.textContent = 'Start with a private workspace. Invite a team whenever you need one.';
  brand.appendChild(logo);
  brand.appendChild(title);
  brand.appendChild(subtitle);

  let errorEl = null;

  const form = document.createElement('form');
  form.className = 'login-form';

  const fullNameField = document.createElement('div');
  const fullNameLabel = document.createElement('label');
  fullNameLabel.className = 'label';
  fullNameLabel.htmlFor = 'fullName';
  fullNameLabel.textContent = 'Full Name';
  const fullNameWrapper = document.createElement('div');
  fullNameWrapper.className = 'login-input-wrapper';
  const fullNameInput = document.createElement('input');
  fullNameInput.id = 'fullName';
  fullNameInput.type = 'text';
  fullNameInput.required = true;
  fullNameInput.className = 'input login-input';
  fullNameInput.placeholder = 'Alex Student';
  const userIcon = icon('user');
  userIcon.className = 'login-input-icon';
  fullNameWrapper.appendChild(fullNameInput);
  fullNameWrapper.appendChild(userIcon);
  fullNameField.appendChild(fullNameLabel);
  fullNameField.appendChild(fullNameWrapper);

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
  passLabel.textContent = 'Password (min. 8 characters)';
  const passWrapper = document.createElement('div');
  passWrapper.className = 'login-input-wrapper';
  const passInput = document.createElement('input');
  passInput.id = 'password';
  passInput.type = 'password';
  passInput.required = true;
  passInput.minLength = 8;
  passInput.className = 'input login-input';
  passInput.placeholder = '••••••••';
  const lockIcon = icon('lock');
  lockIcon.className = 'login-input-icon';
  passWrapper.appendChild(passInput);
  passWrapper.appendChild(lockIcon);
  passField.appendChild(passLabel);
  passField.appendChild(passWrapper);

  const submitBtn = Button({
    children: 'Create Free Account ',
    variant: 'primary',
    className: 'login-submit-btn',
  });
  submitBtn.appendChild(icon('arrowRight'));

  form.appendChild(fullNameField);
  form.appendChild(emailField);
  form.appendChild(passField);
  form.appendChild(submitBtn);

  const footer = document.createElement('div');
  footer.className = 'login-footer';
  const footerText = document.createElement('p');
  footerText.className = 'login-footer-text';
  footerText.textContent = 'Already registered? ';
  const signInLink = document.createElement('a');
  signInLink.className = 'login-footer-link';
  signInLink.href = '/login';
  signInLink.textContent = 'Sign in';
  signInLink.onclick = (e) => { e.preventDefault(); router.navigate('/login'); };
  footerText.appendChild(signInLink);
  footer.appendChild(footerText);

  card.appendChild(brand);
  card.appendChild(form);
  card.appendChild(footer);

  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get('invite');

  async function handleSubmit(e) {
    e.preventDefault();
    if (errorEl) { errorEl.remove(); errorEl = null; }
    if (passInput.value.length < 8) {
      errorEl = document.createElement('div');
      errorEl.className = 'login-error';
      errorEl.appendChild(icon('alertCircle'));
      const span = document.createElement('span');
      span.textContent = 'Password must be at least 8 characters long.';
      errorEl.appendChild(span);
      form.insertBefore(errorEl, form.firstChild);
      return;
    }
    submitBtn.disabled = true;
    try {
      await auth.register(emailInput.value, passInput.value, fullNameInput.value);
      if (inviteToken) {
        await api.acceptWorkspaceInvitation(inviteToken);
        router.navigate('/app/workspaces');
      } else {
        router.navigate('/app');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
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
