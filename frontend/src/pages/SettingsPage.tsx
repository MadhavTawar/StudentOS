import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
  Mail,
  Bot,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { UserPreference } from '../types';
import { Button } from '../components/common/Button';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [timezone, setTimezone] = useState('UTC');
  const [theme, setTheme] = useState('dark');
  const [emailSync, setEmailSync] = useState(true);
  const [aiFeatures, setAiFeatures] = useState(true);
  const [leadTime, setLeadTime] = useState(1440);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await api.getPreferences();
        setPrefs(data);
        setTimezone(data.timezone || 'UTC');
        setTheme(data.theme || 'dark');
        setEmailSync(data.email_sync_enabled);
        setAiFeatures(data.ai_features_enabled);
        setLeadTime(data.reminder_lead_minutes || 1440);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updatePreferences({
        timezone,
        theme,
        email_sync_enabled: emailSync,
        ai_features_enabled: aiFeatures,
        reminder_lead_minutes: leadTime,
      });
      setPrefs(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCachedEmails = async () => {
    if (window.confirm('Clear cached email preview records? (Your created tasks and confirmed deadlines are not affected).')) {
      try {
        await api.disconnectGmail();
        alert('Cached email records cleared.');
      } catch (err: any) {
        alert(err.message || 'Action failed.');
      }
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={4} height="80px" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Settings & Privacy Controls
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Manage your account preferences, local data controls, and transparent privacy safeguards.
        </p>
      </div>

      {saveSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle size={18} />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      {/* Preferences Form */}
      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.75rem' }}>
          Personal Preferences
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label className="label" htmlFor="timezoneSelect">
              Display Time Zone
            </label>
            <select
              id="timezoneSelect"
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (US / Canada)</option>
              <option value="America/Chicago">Central Time (US / Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US / Canada)</option>
              <option value="Europe/London">London (GMT / BST)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="leadTimeSelect">
              Default Deadline Reminder Lead Time
            </label>
            <select
              id="leadTimeSelect"
              className="input"
              value={leadTime}
              onChange={(e) => setLeadTime(parseInt(e.target.value, 10))}
            >
              <option value={60}>1 hour before</option>
              <option value={120}>2 hours before</option>
              <option value={720}>12 hours before</option>
              <option value={1440}>24 hours (1 day before)</option>
              <option value={2880}>48 hours (2 days before)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              id="emailSyncToggle"
              type="checkbox"
              checked={emailSync}
              onChange={(e) => setEmailSync(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <label htmlFor="emailSyncToggle" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              <strong>Enable Gmail Sync:</strong> Periodically refresh academic message headers and preview snippets.
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              id="aiFeaturesToggle"
              type="checkbox"
              checked={aiFeatures}
              onChange={(e) => setAiFeatures(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <label htmlFor="aiFeaturesToggle" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              <strong>Enable AI Assistant & Extraction:</strong> Allows rule-based and provider NLP analysis for candidate proposals.
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-card)', paddingTop: '1rem' }}>
          <Button type="submit" variant="primary" isLoading={isSaving} icon={<Save size={16} />}>
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Transparent Privacy Policy & Data Control */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Shield size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>
            Privacy, Consent & Data Governance
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} color="var(--accent-secondary)" /> What Gmail Data is Accessed?
            </div>
            When you connect Gmail, StudentOS requests strictly <strong>read-only scope (<code>gmail.readonly</code>)</strong>.
            We only fetch recent message headers (sender, subject, date) and brief snippets. We <strong>never download full email bodies</strong> or attachments by default, and we never request permission to send, edit, or delete your emails.
          </div>

          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} color="var(--accent-warning)" /> How Are Tokens Stored?
            </div>
            OAuth access and refresh tokens are <strong>encrypted using AES/Fernet encryption</strong> with a dedicated secret key located outside database storage. Raw credentials are never written to disk or logs.
          </div>

          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={16} color="var(--accent-primary)" /> How Does AI Processing Work?
            </div>
            AI extraction operates strictly as a <strong>proposal generator</strong>. An extracted task or deadline is NEVER automatically committed into your task list without your explicit click on "Approve". When offline or with no API key, StudentOS uses a 100% local rule-based extractor that runs entirely on your local machine without sending text to any external server.
          </div>
        </div>

        {/* Data Clearing Controls */}
        <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>Local Cached Data</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Clear cached email previews and disconnect OAuth tokens from this workstation.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleClearCachedEmails} icon={<Trash2 size={14} />}>
            Clear Email Cache & Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
};
