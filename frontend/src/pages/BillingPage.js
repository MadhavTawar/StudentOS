import { api } from '../api.js';
import { router } from '../router.js';
import { icon } from '../icons.js';

export function render() {
  const container = document.createElement('section');
  container.className = 'account-page billing-page';

  let workspace = null;
  let billing = null;
  let error = '';
  let isLoading = true;

  async function loadBilling() {
    const workspaces = await api.listWorkspaces();
    const selected = workspaces.find((item) => item.id === api.getWorkspaceId())
      ?? workspaces.find((item) => item.is_personal);
    if (!selected) throw new Error('No workspace is available for this account.');
    workspace = selected;
    billing = await api.getWorkspaceBilling(selected.id);
    isLoading = false;
    render();
  }

  const header = document.createElement('header');
  const label = document.createElement('span');
  label.className = 'sidebar-section-label';
  label.textContent = 'ACCOUNT';
  const h1 = document.createElement('h1');
  h1.className = 'page-title page-title-dark';
  h1.textContent = 'Plan & billing';
  const p = document.createElement('p');
  p.className = 'page-description';
  p.textContent = 'Plan information belongs to each workspace.';
  header.appendChild(label);
  header.appendChild(h1);
  header.appendChild(p);
  container.appendChild(header);

  loadBilling().catch((loadError) => {
    error = loadError instanceof Error ? loadError.message : 'Could not load billing details.';
    isLoading = false;
    render();
  });

  if (isLoading) {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = 'Loading plan details…';
    container.appendChild(card);
    return container;
  }

  if (error) {
    const errDiv = document.createElement('div');
    errDiv.className = 'card form-error';
    errDiv.setAttribute('role', 'alert');
    errDiv.textContent = error;
    container.appendChild(errDiv);
  }

  if (billing && workspace) {
    const article = document.createElement('article');
    article.className = 'card billing-card';
    const row = document.createElement('div');
    row.className = 'billing-header-row';
    row.appendChild(icon('creditCard'));
    const info = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.className = 'billing-workspace-title';
    h2.textContent = workspace.name;
    const p2 = document.createElement('p');
    p2.className = 'billing-plan-subtitle';
    p2.textContent = `${billing.plan_code.toUpperCase()} · ${billing.status}`;
    info.appendChild(h2);
    info.appendChild(p2);
    row.appendChild(info);
    article.appendChild(row);

    const notice = document.createElement('div');
    notice.className = 'billing-notice';
    notice.appendChild(icon('sparkles'));
    notice.appendChild(document.createTextNode(' Billing records are ready for a payment-provider integration, but no payment provider is connected and no charge will be made.'));
    article.appendChild(notice);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline';
    btn.disabled = true;
    btn.title = 'Payment integration is not configured';
    btn.textContent = 'Manage subscription — coming later';
    article.appendChild(btn);

    const note = document.createElement('p');
    note.className = 'billing-note';
    note.textContent = 'Plans and prices have not been set. No paid tier is being advertised or enabled.';
    article.appendChild(note);

    container.appendChild(article);
  }

  const link = document.createElement('a');
  link.className = 'billing-manage-link';
  link.href = '/app/workspaces';
  link.textContent = 'Manage workspaces and members';
  link.onclick = (e) => { e.preventDefault(); router.navigate('/app/workspaces'); };
  container.appendChild(link);

  return container;
}
