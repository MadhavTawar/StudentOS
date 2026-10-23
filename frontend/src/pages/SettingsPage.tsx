import React, { useState, useEffect } from 'react';
import {
  Shield,
  Trash2,
  Save,
  CheckCircle,
  Lock,
  Mail,
  Bot,
  Database
} from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const SettingsPage: React.FC = () => {
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
      await api.updatePreferences({
        timezone,
        theme,
        email_sync_enabled: emailSync,
        ai_features_enabled: aiFeatures,
        reminder_lead_minutes: leadTime,
      });
      document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
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
    <div className="account-page settings-page">
      {/* Header */}
      <div>
        <h1 className="page-title">
          Settings & Privacy Controls
        </h1>
        <p className="page-description">
          Manage your account preferences and understand how your workspace data is handled.
        </p>
      </div>

      {saveSuccess && (
        <div className="settings-saved-notice">
          <CheckCircle size={18} />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      {/* Preferences Form */}
      <form onSubmit={handleSave} className="card settings-prefs-form">
        <h2 className="settings-section-title">
          Personal Preferences
        </h2>

        <div className="settings-form-grid">
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

          <div>
            <label className="label" htmlFor="themeSelect">Appearance</label>
            <select
              id="themeSelect"
              className="input"
              value={theme === 'dark' ? 'dark' : 'light'}
              onChange={(event) => {
                const nextTheme = event.target.value;
                setTheme(nextTheme);
                document.documentElement.dataset.theme = nextTheme;
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="settings-toggles">
          <div className="settings-toggle-row">
            <input
              id="emailSyncToggle"
              type="checkbox"
              checked={emailSync}
              onChange={(e) => setEmailSync(e.target.checked)}
              className="settings-checkbox"
            />
            <label htmlFor="emailSyncToggle" className="settings-toggle-label">
              <strong>Enable Gmail Sync:</strong> Periodically refresh academic message headers and preview snippets.
            </label>
          </div>

          <div className="settings-toggle-row">
            <input
              id="aiFeaturesToggle"
              type="checkbox"
              checked={aiFeatures}
              onChange={(e) => setAiFeatures(e.target.checked)}
              className="settings-checkbox"
            />
            <label htmlFor="aiFeaturesToggle" className="settings-toggle-label">
              <strong>Enable AI Assistant & Extraction:</strong> Allows rule-based and provider NLP analysis for candidate proposals.
            </label>
          </div>
        </div>

        <div className="settings-save-actions">
          <Button type="submit" variant="primary" isLoading={isSaving} icon={<Save size={16} />}>
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Transparent Privacy Policy & Data Control */}
      <div className="card settings-data-card">
        <div className="settings-data-header">
          <Shield size={20} color="var(--accent-primary)" />
          <h2 className="settings-section-title">
            Privacy, Consent & Data Governance
          </h2>
        </div>

        <div className="settings-data-content">
          <div className="settings-data-item">
            <div className="settings-data-item-title">
              <Mail size={16} color="var(--accent-secondary)" /> What Gmail Data is Accessed?
            </div>
            When you connect Gmail, StudentOS requests strictly <strong>read-only scope (<code>gmail.readonly</code>)</strong>.
            We only fetch recent message headers (sender, subject, date) and brief snippets. We <strong>never download full email bodies</strong> or attachments by default, and we never request permission to send, edit, or delete your emails.
          </div>

          <div className="settings-data-item">
            <div className="settings-data-item-title">
              <Lock size={16} color="var(--accent-warning)" /> How Are Tokens Stored?
            </div>
            OAuth access and refresh tokens are encrypted using Fernet with a server-configured key. Raw credentials are not shown in the app.
          </div>

          <div className="settings-data-item">
            <div className="settings-data-item-title">
              <Bot size={16} color="var(--accent-primary)" /> How Does AI Processing Work?
            </div>
            AI extraction creates proposals only; a task or deadline is not added until you approve it. The offline provider processes data on the StudentOS backend. If an external AI provider is configured, the relevant prompt and source text may be sent to that provider.
          </div>

          <div className="settings-data-item">
            <div className="settings-data-item-title">
              <Database size={16} color="var(--accent-primary)" /> Personal and shared data
            </div>
            Coursework, reminders, Gmail data, and assistant context are private to your account. Only documents you publish in a shared workspace library are available to that workspace’s members.
          </div>
        </div>

        {/* Data Clearing Controls */}
        <div className="settings-data-clear">
          <div>
            <div className="settings-data-clear-title">Email Data Controls</div>
            <div className="settings-data-clear-desc">
              Clear stored email previews and disconnect the connected Google account.
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
