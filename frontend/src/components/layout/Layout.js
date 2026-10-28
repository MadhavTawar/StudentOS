import { auth } from '../../auth.js';
import { api } from '../../api.js';
import { router } from '../../router.js';
import { TopBar } from './TopBar.js';
import { LoadingSkeleton } from '../index.js';

export function Layout() {
  const shell = document.createElement('div');
  shell.className = 'app-shell app-shell-study';
  shell.style.display = 'flex';
  shell.style.flexDirection = 'column';
  shell.style.minHeight = '100vh';
  shell.style.background = 'var(--bg-main)';

  const content = document.createElement('div');
  content.className = 'app-content';
  content.style.display = 'flex';
  content.style.flex = '1';
  content.style.flexDirection = 'column';
  content.style.minWidth = '0';

  const main = document.createElement('main');
  main.className = 'app-main';
  main.style.flex = '1';
  main.style.minWidth = '0';
  main.style.overflowY = 'auto';
  main.style.padding = 'clamp(1rem, 2.2vw, 1.75rem) clamp(1rem, 3vw, 2.5rem)';

  const inner = document.createElement('div');
  inner.className = 'app-main-inner';
  inner.style.width = '100%';
  inner.style.maxWidth = '1280px';
  inner.style.margin = '0 auto';

  const outlet = document.createElement('div');
  outlet.id = 'layout-outlet';
  inner.appendChild(outlet);
  main.appendChild(inner);
  content.appendChild(main);
  shell.appendChild(content);

  let isCurrent = true;
  let unsub = null;
  let topBarCleanup = null;

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem('studentos-theme', theme); } catch {}
  }

  function loadPreferences() {
    if (!auth.isAuthenticated) {
      setTheme('light');
      return;
    }
    isCurrent = true;
    api.getPreferences()
      .then((preferences) => {
        if (isCurrent) {
          const resolved = preferences.theme === 'dark' ? 'dark' : 'light';
          setTheme(resolved);
        }
      })
      .catch(() => {
        if (isCurrent) setTheme('light');
      });
  }

  function render() {
    if (auth.isLoading) {
      shell.innerHTML = '';
      const loader = document.createElement('div');
      loader.style.display = 'flex';
      loader.style.height = '100vh';
      loader.style.alignItems = 'center';
      loader.style.justifyContent = 'center';
      loader.style.backgroundColor = 'var(--bg-main)';
      loader.style.padding = '2rem';
      const box = document.createElement('div');
      box.style.width = '320px';
      box.style.textAlign = 'center';
      const title = document.createElement('div');
      title.style.fontWeight = '700';
      title.style.fontSize = '1.25rem';
      title.style.marginBottom = '1rem';
      title.style.color = 'var(--accent-primary)';
      title.textContent = 'StudentOS';
      box.appendChild(title);
      box.appendChild(LoadingSkeleton({ rows: 3, height: '20px' }));
      loader.appendChild(box);
      shell.appendChild(loader);
      return;
    }

    if (!auth.isAuthenticated) {
      router.navigate('/login');
      return;
    }

    shell.innerHTML = '';
    shell.appendChild(content);
    content.innerHTML = '';
    content.appendChild(main);

    const topBarEl = TopBar();
    main.appendChild(topBarEl.element);
    topBarCleanup = topBarEl.cleanup;
    main.appendChild(outlet);

    const current = router.current;
    if (current) {
      const el = current.component.render ? current.component.render() : current.component();
      outlet.innerHTML = '';
      if (el instanceof Node) outlet.appendChild(el);
      else if (typeof el === 'string') outlet.innerHTML = el;
    }
  }

  unsub = auth.subscribe(render);

  loadPreferences();
  render();

  const cleanup = () => {
    isCurrent = false;
    if (unsub) unsub();
    if (topBarCleanup) topBarCleanup();
  };

  return { element: shell, cleanup };
}
