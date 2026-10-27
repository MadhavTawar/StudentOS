import { api } from '../api.js';
import { icon } from '../icons.js';

export function render() {
  const container = document.createElement('section');
  container.className = 'account-page workspace-page';

  let workspaces = [];
  let members = [];
  let activeId = api.getWorkspaceId() ?? '';
  let name = '';
  let inviteUrl = '';
  let isLoading = true;
  let isBusy = false;
  let error = '';
  let notice = '';

  async function refresh() {
    const items = await api.listWorkspaces();
    workspaces = items;
    const current = items.find((workspace) => workspace.id === api.getWorkspaceId())
      ?? items.find((workspace) => workspace.is_personal);
    if (current) {
      activeId = current.id;
      api.setWorkspaceId(current.id);
      members = await api.listWorkspaceMembers(current.id);
    }
  }

  async function load() {
    try {
      await refresh();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Could not load workspaces.';
    } finally {
      isLoading = false;
      render();
    }
  }

  async function createWorkspace(e) {
    e.preventDefault();
    isBusy = true;
    error = '';
    notice = '';
    render();
    try {
      const workspace = await api.createWorkspace(name);
      api.setWorkspaceId(workspace.id);
      activeId = workspace.id;
      name = '';
      await refresh();
      notice = 'Shared workspace created. Invite collaborators to share its library.';
    } catch (createError) {
      error = createError instanceof Error ? createError.message : 'Could not create the workspace.';
    } finally {
      isBusy = false;
      render();
    }
  }

  async function createInvite(e) {
    e.preventDefault();
    const activeWorkspace = workspaces.find((w) => w.id === activeId);
    if (!activeWorkspace) return;
    isBusy = true;
    error = '';
    notice = '';
    inviteUrl = '';
    render();
    try {
      const invite = await api.createWorkspaceInvitation(activeWorkspace.id);
      inviteUrl = new URL(`/join?token=${encodeURIComponent(invite.token)}`, window.location.origin).toString();
      notice = 'Invite link created. Anyone with this one-time link can join; share it privately. It expires in seven days.';
    } catch (inviteError) {
      error = inviteError instanceof Error ? inviteError.message : 'Could not create an invite.';
    } finally {
      isBusy = false;
      render();
    }
  }

  async function selectWorkspace(workspaceId) {
    activeId = workspaceId;
    api.setWorkspaceId(workspaceId);
    inviteUrl = '';
    try {
      members = await api.listWorkspaceMembers(workspaceId);
    } catch (memberError) {
      error = memberError instanceof Error ? memberError.message : 'Could not load workspace members.';
    }
    render();
  }

  const header = document.createElement('header');
  const label = document.createElement('span');
  label.className = 'sidebar-section-label';
  label.textContent = 'YOUR ACCOUNT';
  const h1 = document.createElement('h1');
  h1.className = 'page-title page-title-dark';
  h1.textContent = 'Workspaces';
  const p = document.createElement('p');
  p.className = 'page-description';
  p.textContent = 'Keep your study data personal. Share a library with collaborators only through an organization workspace.';
  header.appendChild(label);
  header.appendChild(h1);
  header.appendChild(p);
  container.appendChild(header);

  if (error) {
    const errDiv = document.createElement('div');
    errDiv.className = 'card form-error';
    errDiv.setAttribute('role', 'alert');
    errDiv.textContent = error;
    container.appendChild(errDiv);
  }
  if (notice) {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'card form-success';
    noticeDiv.setAttribute('role', 'status');
    noticeDiv.textContent = notice;
    container.appendChild(noticeDiv);
  }

  if (isLoading) {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = 'Loading workspaces…';
    container.appendChild(card);
    load();
    return container;
  }

  // Active workspace
  const card1 = document.createElement('section');
  card1.className = 'card workspace-card';
  const l1 = document.createElement('label');
  l1.className = 'label';
  l1.htmlFor = 'workspace-select';
  l1.textContent = 'Active workspace';
  const select = document.createElement('select');
  select.id = 'workspace-select';
  select.className = 'input';
  select.value = activeId;
  select.onchange = (e) => selectWorkspace(e.target.value);
  workspaces.forEach((workspace) => {
    const opt = document.createElement('option');
    opt.value = workspace.id;
    opt.textContent = `${workspace.is_personal ? 'Personal · ' : 'Shared · '}${workspace.name}`;
    select.appendChild(opt);
  });
  const activeWorkspace = workspaces.find((w) => w.id === activeId);
  card1.appendChild(l1);
  card1.appendChild(select);
  if (activeWorkspace) {
    const info = document.createElement('p');
    info.className = 'workspace-role-info';
    info.textContent = `Role: ${activeWorkspace.role} · Plan: ${activeWorkspace.plan_code}`;
    card1.appendChild(info);
  }
  container.appendChild(card1);

  // Create workspace
  const card2 = document.createElement('section');
  card2.className = 'card workspace-card';
  const h2 = document.createElement('h2');
  h2.className = 'workspace-card-title';
  h2.textContent = 'Create a shared workspace';
  const p2 = document.createElement('p');
  p2.className = 'workspace-card-description';
  p2.textContent = 'Collaborators can access documents and references published to its shared library. Your coursework, Gmail, and reminders remain private.';
  card2.appendChild(h2);
  card2.appendChild(p2);
  const form = document.createElement('form');
  form.className = 'workspace-create-form';
  form.onsubmit = createWorkspace;
  const input = document.createElement('input');
  input.className = 'input workspace-name-input';
  input.setAttribute('aria-label', 'Shared workspace name');
  input.placeholder = 'e.g. Study group';
  input.value = name;
  input.minLength = 2;
  input.maxLength = 120;
  input.required = true;
  input.oninput = (e) => { name = e.target.value; };
  const createBtn = document.createElement('button');
  createBtn.className = 'btn btn-primary';
  createBtn.type = 'submit';
  createBtn.disabled = isBusy;
  createBtn.appendChild(icon('plus'));
  createBtn.appendChild(document.createTextNode(' Create workspace'));
  form.appendChild(input);
  form.appendChild(createBtn);
  card2.appendChild(form);
  container.appendChild(card2);

  if (activeWorkspace && !activeWorkspace.is_personal) {
    // Invite collaborators
    const card3 = document.createElement('section');
    card3.className = 'card workspace-card';
    const h3 = document.createElement('h2');
    h3.className = 'workspace-card-title';
    h3.textContent = 'Invite collaborators';
    const p3 = document.createElement('p');
    p3.className = 'workspace-card-description';
    p3.textContent = 'The link is a bearer invite: anyone who has it can join once. It expires after seven days; email delivery is not configured.';
    card3.appendChild(h3);
    card3.appendChild(p3);
    const form2 = document.createElement('form');
    form2.className = 'workspace-create-form';
    form2.onsubmit = createInvite;
    const genBtn = document.createElement('button');
    genBtn.className = 'btn btn-primary';
    genBtn.type = 'submit';
    genBtn.disabled = isBusy || activeWorkspace.role === 'member';
    genBtn.appendChild(icon('users'));
    genBtn.appendChild(document.createTextNode(' Generate one-time invite link'));
    form2.appendChild(genBtn);
    card3.appendChild(form2);

    if (inviteUrl) {
      const row = document.createElement('div');
      row.className = 'workspace-invite-row';
      const invInput = document.createElement('input');
      invInput.className = 'input workspace-invite-input';
      invInput.readOnly = true;
      invInput.value = inviteUrl;
      invInput.setAttribute('aria-label', 'Workspace invitation link');
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-outline';
      copyBtn.appendChild(icon('copy'));
      copyBtn.appendChild(document.createTextNode(' Copy link'));
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(inviteUrl)
          .then(() => { notice = 'Invite link copied. Share it only with trusted collaborators.'; render(); })
          .catch(() => { error = 'Could not copy the invite link. Select and copy it from the field instead.'; render(); });
      };
      row.appendChild(invInput);
      row.appendChild(copyBtn);
      card3.appendChild(row);
    }
    container.appendChild(card3);

    // Members
    const card4 = document.createElement('section');
    card4.className = 'card workspace-card';
    const h4 = document.createElement('h2');
    h4.className = 'workspace-card-title';
    h4.textContent = 'Members';
    card4.appendChild(h4);
    const ul = document.createElement('ul');
    ul.className = 'workspace-members-list';
    members.forEach((member) => {
      const li = document.createElement('li');
      li.className = 'workspace-member-row';
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = member.full_name;
      const small = document.createElement('small');
      small.className = 'workspace-member-email';
      small.textContent = member.email;
      span.appendChild(strong);
      span.appendChild(small);
      const role = document.createElement('span');
      role.className = 'workspace-member-role';
      role.textContent = member.role;
      li.appendChild(span);
      li.appendChild(role);
      ul.appendChild(li);
    });
    card4.appendChild(ul);
    container.appendChild(card4);
  }

  load();
  return container;
}
