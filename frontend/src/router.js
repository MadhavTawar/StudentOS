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
    window.addEventListener('popstate', () => this.navigate(window.location.pathname));
    this.navigate(window.location.pathname);
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
      container.innerHTML = '';
      const el = match.component.render ? match.component.render() : match.component();
      if (el instanceof Node) {
        container.appendChild(el);
      } else if (typeof el === 'string') {
        container.innerHTML = el;
      }
    }
  },
  get current() {
    return currentRoute;
  },
};
