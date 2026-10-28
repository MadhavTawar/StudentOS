import { router } from '../router.js';
import { render as TasksPage } from './TasksPage.js';
import { render as DeadlinesPage } from './DeadlinesPage.js';

export function render() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') === 'deadlines' ? 'deadlines' : 'tasks';

  const container = document.createElement('section');
  container.className = 'planner-page';

  const header = document.createElement('header');
  header.className = 'card planner-header';
  const content = document.createElement('div');
  content.className = 'planner-header-content';
  const left = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'planner-title';
  h1.textContent = 'Planner';
  left.appendChild(h1);

  const switcher = document.createElement('div');
  switcher.className = 'planner-switcher';
  switcher.setAttribute('role', 'tablist');
  switcher.setAttribute('aria-label', 'Planner view');

  const tasksBtn = document.createElement('button');
  tasksBtn.type = 'button';
  tasksBtn.setAttribute('role', 'tab');
  tasksBtn.setAttribute('aria-selected', view === 'tasks');
  tasksBtn.className = `planner-tab ${view === 'tasks' ? 'is-active' : ''}`;
  tasksBtn.appendChild(document.createElement('span'));
  tasksBtn.firstChild.appendChild(document.createTextNode('Tasks'));
  tasksBtn.onclick = () => setView('tasks');

  const calBtn = document.createElement('button');
  calBtn.type = 'button';
  calBtn.setAttribute('role', 'tab');
  calBtn.setAttribute('aria-selected', view === 'deadlines');
  calBtn.className = `planner-tab planner-tab-deadlines ${view === 'deadlines' ? 'is-active' : ''}`;
  calBtn.appendChild(document.createTextNode('Calendar'));
  calBtn.onclick = () => setView('deadlines');

  switcher.appendChild(tasksBtn);
  switcher.appendChild(calBtn);
  content.appendChild(left);
  content.appendChild(switcher);
  header.appendChild(content);
  container.appendChild(header);

  const outlet = document.createElement('div');
  outlet.id = 'planner-outlet';
  container.appendChild(outlet);

  function setView(nextView) {
    const params2 = new URLSearchParams(window.location.search);
    params2.set('view', nextView);
    const q = params.get('q');
    if (q) params2.set('q', q);
    router.replace(`${window.location.pathname}?${params2.toString()}`);
  }

  const page = view === 'tasks' ? TasksPage : DeadlinesPage;
  const el = page.render();
  outlet.innerHTML = '';
  if (el instanceof Node) outlet.appendChild(el);
  return container;
}
