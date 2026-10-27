import { Layout } from './components/layout/Layout.js';
import { router } from './router.js';
import { auth } from './auth.js';
import { registerRoutes } from './app.js';

export function initApp() {
  auth.init();
  registerRoutes();

  const root = document.getElementById('root');
  if (!root) return;

  const layout = Layout();
  root.innerHTML = '';
  root.appendChild(layout.element);

  router.start(document.getElementById('layout-outlet'));

  return {
    cleanup: () => {
      layout.cleanup();
    },
  };
}
