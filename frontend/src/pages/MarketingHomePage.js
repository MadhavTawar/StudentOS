import { auth } from '../auth.js';
import { router } from '../router.js';
import { icon } from '../icons.js';

export function render() {
  if (!auth.isLoading && auth.isAuthenticated) {
    router.navigate('/app');
    return document.createElement('div');
  }

  const main = document.createElement('main');
  main.className = 'marketing-page';

  const header = document.createElement('header');
  header.className = 'marketing-header';

  const logo = document.createElement('a');
  logo.className = 'marketing-logo';
  logo.href = '/';
  logo.style.display = 'inline-flex';
  logo.style.alignItems = 'center';
  logo.style.gap = '0.5rem';
  logo.style.color = 'var(--text-main)';
  logo.style.fontFamily = 'var(--font-display)';
  logo.style.fontSize = '1.05rem';
  logo.style.fontWeight = '600';
  logo.style.letterSpacing = '-0.03em';
  logo.style.textDecoration = 'none';
  const student = document.createTextNode('Student');
  const accent = document.createElement('span');
  accent.className = 'marketing-accent';
  accent.textContent = 'OS';
  accent.style.color = 'var(--accent-primary)';
  logo.appendChild(student);
  logo.appendChild(accent);
  logo.onclick = (e) => { e.preventDefault(); router.navigate('/'); };

  const nav = document.createElement('nav');
  nav.className = 'marketing-nav';
  const signIn = document.createElement('a');
  signIn.className = 'marketing-nav-link';
  signIn.href = '/login';
  signIn.textContent = 'Sign in';
  signIn.onclick = (e) => { e.preventDefault(); router.navigate('/login'); };
  const getStarted = document.createElement('a');
  getStarted.className = 'btn btn-primary btn-sm';
  getStarted.href = '/register';
  getStarted.textContent = 'Get started ';
  getStarted.appendChild(icon('arrowRight'));
  getStarted.onclick = (e) => { e.preventDefault(); router.navigate('/register'); };
  nav.appendChild(signIn);
  nav.appendChild(getStarted);
  header.appendChild(logo);
  header.appendChild(nav);

  const section = document.createElement('section');
  section.className = 'marketing-hero';

  const heroText = document.createElement('div');
  heroText.className = 'marketing-hero-text';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'marketing-eyebrow';
  eyebrow.appendChild(icon('sparkles'));
  const eyebrowText = document.createTextNode(' Your personal study system');
  eyebrow.appendChild(eyebrowText);

  const title = document.createElement('h1');
  title.className = 'marketing-title';
  title.textContent = 'Make room for the work that matters.';

  const desc = document.createElement('p');
  desc.className = 'marketing-description';
  desc.textContent = 'StudentOS brings coursework, deadlines, and study support into one calm, private workspace. Start on your own, then share a resource library with a team when you need to.';

  const actions = document.createElement('div');
  actions.className = 'marketing-hero-actions';

  const createAcct = document.createElement('a');
  createAcct.className = 'btn btn-primary';
  createAcct.href = '/register';
  createAcct.textContent = 'Create a free account ';
  createAcct.appendChild(icon('arrowRight'));
  createAcct.onclick = (e) => { e.preventDefault(); router.navigate('/register'); };

  const haveAcct = document.createElement('a');
  haveAcct.className = 'btn btn-outline';
  haveAcct.href = '/login';
  haveAcct.textContent = 'I already have an account';
  haveAcct.onclick = (e) => { e.preventDefault(); router.navigate('/login'); };

  actions.appendChild(createAcct);
  actions.appendChild(haveAcct);

  const note = document.createElement('p');
  note.className = 'marketing-footer-note';
  note.textContent = 'No institution email required. Your personal study data stays private to your account.';

  heroText.appendChild(eyebrow);
  heroText.appendChild(title);
  heroText.appendChild(desc);
  heroText.appendChild(actions);
  heroText.appendChild(note);

  const desk = document.createElement('div');
  desk.className = 'card marketing-desk';
  const deskHeader = document.createElement('div');
  deskHeader.className = 'marketing-desk-header';
  const deskLeft = document.createElement('div');
  const deskEyebrow = document.createElement('span');
  deskEyebrow.className = 'marketing-desk-eyebrow';
  deskEyebrow.textContent = 'YOUR STUDY DESK';
  const deskTitle = document.createElement('h2');
  deskTitle.className = 'marketing-desk-title';
  deskTitle.textContent = 'A little more clarity';
  deskLeft.appendChild(deskEyebrow);
  deskLeft.appendChild(deskTitle);
  const deskIcon = document.createElement('div');
  deskIcon.className = 'marketing-desk-icon';
  deskIcon.appendChild(icon('lockKeyhole'));
  deskHeader.appendChild(deskLeft);
  deskHeader.appendChild(deskIcon);

  const rows = [
    ['Today', 'Finish biology reading', '40 min · In progress'],
    ['Tomorrow', 'Submit design reflection', 'Due at 5:00 PM'],
    ['This week', 'Review your study plan', '3 tasks on track'],
  ];
  rows.forEach(([label, titleText, detail]) => {
    const item = document.createElement('div');
    item.className = 'marketing-desk-item';
    const lbl = document.createElement('span');
    lbl.className = 'marketing-desk-label';
    lbl.textContent = label;
    const inner = document.createElement('div');
    const task = document.createElement('strong');
    task.className = 'marketing-desk-task';
    task.textContent = titleText;
    const det = document.createElement('div');
    det.className = 'marketing-desk-detail';
    det.textContent = detail;
    inner.appendChild(task);
    inner.appendChild(det);
    item.appendChild(lbl);
    item.appendChild(inner);
    desk.appendChild(item);
  });

  const deskNote = document.createElement('div');
  deskNote.className = 'marketing-desk-note';
  const noteIcon = icon('users');
  noteIcon.className = 'marketing-desk-note-icon';
  deskNote.appendChild(noteIcon);
  const noteText = document.createTextNode(' Personal by default. Share a workspace library only when you choose.');
  deskNote.appendChild(noteText);

  desk.appendChild(deskHeader);
  desk.appendChild(deskNote);

  section.appendChild(heroText);
  section.appendChild(desk);

  const features = document.createElement('section');
  features.className = 'marketing-features';
  const grid = document.createElement('div');
  grid.className = 'marketing-features-grid';

  const featureList = [
    {
      title: 'Your work, in one place',
      description: 'Plan coursework, track dates, and keep your next steps visible.',
      icon: 'checkCircle2',
    },
    {
      title: 'AI that assists, not decides',
      description: 'Turn messages into reviewable ideas and keep control of every change.',
      icon: 'sparkles',
    },
    {
      title: 'A library you can trust',
      description: 'Keep personal references private or publish resources to a shared workspace.',
      icon: 'bookOpen',
    },
  ];

  featureList.forEach((f) => {
    const article = document.createElement('article');
    article.className = 'card marketing-feature-card';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'marketing-feature-icon';
    iconDiv.appendChild(icon(f.icon));
    const h2 = document.createElement('h2');
    h2.className = 'marketing-feature-title';
    h2.textContent = f.title;
    const p = document.createElement('p');
    p.className = 'marketing-feature-description';
    p.textContent = f.description;
    article.appendChild(iconDiv);
    article.appendChild(h2);
    article.appendChild(p);
    grid.appendChild(article);
  });

  features.appendChild(grid);

  main.appendChild(header);
  main.appendChild(section);
  main.appendChild(features);
  return main;
}
