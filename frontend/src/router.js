const routes = [];
let currentRoute = null;
let container = null;
let started = false;

export const router = {
  add(path, component) {
    routes.push({ path, component });
  },
  start(rootElement) {
    container = rootElement;
    started = true;
    window.addEventListener('popstate', handlePopState);
    this.handle(window.location.pathname);
  },
  stop() {
    window.removeEventListener('popstate', handlePopState);
    started = false;
    container = null;
  },
  navigate(path) {
    if (!started) return;
    window.history.pushState(null, '', path);
    this.handle(path);
  },
  replace(path) {
    if (!started) return;
    window.history.replaceState(null, '', path);
    this.handle(path);
  },
  handle(path) {
    const normalized = path.split('?')[0];
    let match = routes.find((r) => r.path === normalized);
    if (!match) {
      match = routes.find((r) => r.path === '*');
    }
    currentRoute = match;
    if (container && match) {
      try {
        container.innerHTML = '';
        const el = match.component.render ? match.component.render() : match.component();
        if (el instanceof Node) {
          container.appendChild(el);
        } else if (typeof el === 'string') {
          container.innerHTML = el;
        }
      } catch (err) {
        container.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.style.padding = '2rem';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.color = 'var(--accent-danger)';
        errorDiv.textContent = `Error rendering page: ${err instanceof Error ? err.message : String(err)}`;
        container.appendChild(errorDiv);
      }
    }
  },
  get current() {
    return currentRoute;
  },
};

function handlePopState() {
  if (router.started) {
    router.handle(window.location.pathname);
  }
}
