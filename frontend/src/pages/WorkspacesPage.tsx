import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Copy, Plus, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Workspace, WorkspaceMember } from '../types';

export const WorkspacesPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activeId, setActiveId] = useState(api.getWorkspaceId() ?? '');
  const [name, setName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId);

  const refresh = useCallback(async () => {
    const items = await api.listWorkspaces();
    setWorkspaces(items);
    const current = items.find((workspace) => workspace.id === api.getWorkspaceId())
      ?? items.find((workspace) => workspace.is_personal);
    if (current) {
      setActiveId(current.id);
      api.setWorkspaceId(current.id);
      setMembers(await api.listWorkspaceMembers(current.id));
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load workspaces.'))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const createWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const workspace = await api.createWorkspace(name);
      api.setWorkspaceId(workspace.id);
      setActiveId(workspace.id);
      setName('');
      await refresh();
      setNotice('Shared workspace created. Invite collaborators to share its library.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the workspace.');
    } finally {
      setIsBusy(false);
    }
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeWorkspace) return;
    setIsBusy(true);
    setError('');
    setNotice('');
    setInviteUrl('');
    try {
      const invite = await api.createWorkspaceInvitation(activeWorkspace.id);
      setInviteUrl(new URL(`/join?token=${encodeURIComponent(invite.token)}`, window.location.origin).toString());
      setNotice('Invite link created. Anyone with this one-time link can join; share it privately. It expires in seven days.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Could not create an invite.');
    } finally {
      setIsBusy(false);
    }
  };

  const selectWorkspace = async (workspaceId: string) => {
    setActiveId(workspaceId);
    api.setWorkspaceId(workspaceId);
    setInviteUrl('');
    try {
      setMembers(await api.listWorkspaceMembers(workspaceId));
    } catch (memberError) {
      setError(memberError instanceof Error ? memberError.message : 'Could not load workspace members.');
    }
  };

  if (isLoading) return <div className="card">Loading workspaces…</div>;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header>
        <span className="sidebar-section-label">YOUR ACCOUNT</span>
        <h1 style={{ margin: '0.35rem 0', color: 'var(--text-main)' }}>Workspaces</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Keep your study data personal. Share a library with collaborators only through an organization workspace.
        </p>
      </header>

      {error && <div className="card" role="alert" style={{ color: '#fca5a5' }}>{error}</div>}
      {notice && <div className="card" role="status" style={{ color: '#34d399' }}>{notice}</div>}

      <section className="card" style={{ padding: '1.25rem' }}>
        <label className="label" htmlFor="workspace-select">Active workspace</label>
        <select
          id="workspace-select"
          className="input"
          value={activeId}
          onChange={(event) => void selectWorkspace(event.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.is_personal ? 'Personal · ' : 'Shared · '}{workspace.name}
            </option>
          ))}
        </select>
        {activeWorkspace && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 0 }}>
            Role: {activeWorkspace.role} · Plan: {activeWorkspace.plan_code}
          </p>
        )}
      </section>

      <section className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Create a shared workspace</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>
          Collaborators can access documents and references published to its shared library. Your coursework, Gmail, and reminders remain private.
        </p>
        <form onSubmit={(event) => void createWorkspace(event)} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            aria-label="Shared workspace name"
            placeholder="e.g. Study group"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={120}
            required
            style={{ flex: '1 1 240px' }}
          />
          <button className="btn btn-primary" type="submit" disabled={isBusy}>
            <Plus size={16} /> Create workspace
          </button>
        </form>
      </section>

      {activeWorkspace && !activeWorkspace.is_personal && (
        <>
          <section className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Invite collaborators</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>
              The link is a bearer invite: anyone who has it can join once. It expires after seven days; email delivery is not configured.
            </p>
            <form onSubmit={(event) => void createInvite(event)} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={isBusy || activeWorkspace.role === 'member'}>
                <Users size={16} /> Generate one-time invite link
              </button>
            </form>
            {inviteUrl && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <input className="input" readOnly value={inviteUrl} aria-label="Workspace invitation link" style={{ flex: '1 1 260px' }} />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl)
                      .then(() => setNotice('Invite link copied. Share it only with trusted collaborators.'))
                      .catch(() => setError('Could not copy the invite link. Select and copy it from the field instead.'));
                  }}
                >
                  <Copy size={15} /> Copy link
                </button>
              </div>
            )}
          </section>

          <section className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Members</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {members.map((member) => (
                <li key={member.user_id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0', borderTop: '1px solid var(--border-card)' }}>
                  <span><strong>{member.full_name}</strong><small style={{ display: 'block', color: 'var(--text-muted)' }}>{member.email}</small></span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{member.role}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
};
