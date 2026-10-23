import React, { useEffect, useState } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Workspace, WorkspaceBilling } from '../types';

export const BillingPage: React.FC = () => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [billing, setBilling] = useState<WorkspaceBilling | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBilling = async () => {
      const workspaces = await api.listWorkspaces();
      const selected = workspaces.find((item) => item.id === api.getWorkspaceId())
        ?? workspaces.find((item) => item.is_personal);
      if (!selected) throw new Error('No workspace is available for this account.');
      setWorkspace(selected);
      setBilling(await api.getWorkspaceBilling(selected.id));
    };
    loadBilling()
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load billing details.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="card">Loading plan details…</div>;

  return (
    <section className="account-page billing-page">
      <header>
        <span className="sidebar-section-label">ACCOUNT</span>
        <h1 className="page-title page-title-dark">Plan & billing</h1>
        <p className="page-description">Plan information belongs to each workspace.</p>
      </header>
      {error && <div className="card form-error" role="alert">{error}</div>}
      {billing && workspace && (
        <article className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <CreditCard size={21} color="var(--accent-primary)" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{workspace.name}</h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {billing.plan_code.toUpperCase()} · {billing.status}
              </p>
            </div>
          </div>
          <div style={{ margin: '1.25rem 0', padding: '1rem', borderRadius: 12, background: 'rgba(211, 131, 91, 0.08)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <Sparkles size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Billing records are ready for a payment-provider integration, but no payment provider is connected and no charge will be made.
          </div>
          <button type="button" className="btn btn-outline" disabled title="Payment integration is not configured">
            Manage subscription — coming later
          </button>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginBottom: 0 }}>
            Plans and prices have not been set. No paid tier is being advertised or enabled.
          </p>
        </article>
      )}
      <Link to="/app/workspaces" style={{ color: 'var(--accent-primary)' }}>Manage workspaces and members</Link>
    </section>
  );
};
