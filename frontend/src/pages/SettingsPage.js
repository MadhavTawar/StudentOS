import { api } from '../api.js';
import { icon } from '../icons.js';
import { Button } from '../components/index.js';
import { LoadingSkeleton } from '../components/index.js';

export function render() {
  const container = document.createElement('div');
  container.className = 'account-page settings-page';

  let isLoading = true;
  let isSaving = false;
  let saveSuccess = false;

  let timezone = 'UTC';
  let theme = 'dark';
  let emailSync = true;
  let aiFeatures = true;
  let leadTime = 1440;
  let emailNotifications = false;
  let taskReminders = true;
  let deadlineReminders = true;
  let examReminders = true;
  let overdueReminders = false;
  let dailySummary = false;

  async function loadPrefs() {
    try {
      const data = await api.getPreferences();
      timezone = data.timezone || 'UTC';
      theme = data.theme || 'dark';
      emailSync = data.email_sync_enabled;
      aiFeatures = data.ai_features_enabled;
      leadTime = data.reminder_lead_minutes || 1440;
      emailNotifications = data.email_notifications_enabled || false;
      taskReminders = data.task_reminders_enabled !== false;
      deadlineReminders = data.deadline_reminders_enabled !== false;
      examReminders = data.exam_reminders_enabled !== false;
      overdueReminders = data.overdue_reminders_enabled || false;
      dailySummary = data.daily_summary_enabled || false;
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
      render();
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    isSaving = true;
    saveSuccess = false;
    render();
    try {
      await api.updatePreferences({
        timezone,
        theme,
        email_sync_enabled: emailSync,
        ai_features_enabled: aiFeatures,
        reminder_lead_minutes: leadTime,
        email_notifications_enabled: emailNotifications,
        task_reminders_enabled: taskReminders,
        deadline_reminders_enabled: deadlineReminders,
        exam_reminders_enabled: examReminders,
        overdue_reminders_enabled: overdueReminders,
        daily_summary_enabled: dailySummary,
      });
      document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
      saveSuccess = true;
      setTimeout(() => { saveSuccess = false; render(); }, 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update preferences.');
    } finally {
      isSaving = false;
      render();
    }
  }

  async function handleClearCachedEmails() {
    if (!window.confirm('Clear cached email preview records? (Your created tasks and confirmed deadlines are not affected).')) return;
    try {
      await api.disconnectGmail();
      alert('Cached email records cleared.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    }
  }

  const header = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'page-title';
  h1.textContent = 'Settings & Privacy Controls';
  const desc = document.createElement('p');
  desc.className = 'page-description';
  desc.textContent = 'Manage your account preferences and understand how your workspace data is handled.';
  header.appendChild(h1);
  header.appendChild(desc);
  container.appendChild(header);

  if (saveSuccess) {
    const notice = document.createElement('div');
    notice.className = 'settings-saved-notice';
    notice.appendChild(icon('checkCircle'));
    const span = document.createElement('span');
    span.textContent = 'Preferences saved successfully.';
    notice.appendChild(span);
    container.appendChild(notice);
  }

  if (isLoading) {
    container.appendChild(LoadingSkeleton({ rows: 4, height: '80px' }));
    loadPrefs();
    return container;
  }

  const form = document.createElement('form');
  form.className = 'card settings-prefs-form';
  form.onsubmit = handleSave;

  const h2 = document.createElement('h2');
  h2.className = 'settings-section-title';
  h2.textContent = 'Personal Preferences';
  form.appendChild(h2);

  const grid = document.createElement('div');
  grid.className = 'settings-form-grid';

  const f1 = document.createElement('div');
  const l1 = document.createElement('label');
  l1.className = 'label';
  l1.htmlFor = 'timezoneSelect';
  l1.textContent = 'Display Time Zone';
  const s1 = document.createElement('select');
  s1.id = 'timezoneSelect';
  s1.className = 'input';
  s1.value = timezone;
  s1.onchange = (e) => { timezone = e.target.value; };
  ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v === 'UTC' ? 'UTC (Coordinated Universal Time)' : v === 'America/New_York' ? 'Eastern Time (US / Canada)' : v === 'America/Chicago' ? 'Central Time (US / Canada)' : v === 'America/Los_Angeles' ? 'Pacific Time (US / Canada)' : v === 'Europe/London' ? 'London (GMT / BST)' : v === 'Asia/Kolkata' ? 'India Standard Time (IST)' : 'Japan Standard Time (JST)';
    s1.appendChild(opt);
  });
  f1.appendChild(l1);
  f1.appendChild(s1);

  const f2 = document.createElement('div');
  const l2 = document.createElement('label');
  l2.className = 'label';
  l2.htmlFor = 'leadTimeSelect';
  l2.textContent = 'Default Deadline Reminder Lead Time';
  const s2 = document.createElement('select');
  s2.id = 'leadTimeSelect';
  s2.className = 'input';
  s2.value = String(leadTime);
  s2.onchange = (e) => { leadTime = parseInt(e.target.value, 10); };
  [60, 120, 720, 1440, 2880].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = v === 60 ? '1 hour before' : v === 120 ? '2 hours before' : v === 720 ? '12 hours before' : v === 1440 ? '24 hours (1 day before)' : '48 hours (2 days before)';
    s2.appendChild(opt);
  });
  f2.appendChild(l2);
  f2.appendChild(s2);

  const f3 = document.createElement('div');
  const l3 = document.createElement('label');
  l3.className = 'label';
  l3.htmlFor = 'themeSelect';
  l3.textContent = 'Appearance';
  const s3 = document.createElement('select');
  s3.id = 'themeSelect';
  s3.className = 'input';
  s3.value = theme === 'dark' ? 'dark' : 'light';
  s3.onchange = (e) => {
    theme = e.target.value;
    document.documentElement.dataset.theme = theme;
  };
  const optLight = document.createElement('option');
  optLight.value = 'light';
  optLight.textContent = 'Light';
  const optDark = document.createElement('option');
  optDark.value = 'dark';
  optDark.textContent = 'Dark';
  s3.appendChild(optLight);
  s3.appendChild(optDark);
  f3.appendChild(l3);
  f3.appendChild(s3);

  grid.appendChild(f1);
  grid.appendChild(f2);
  grid.appendChild(f3);
  form.appendChild(grid);

  const toggles = document.createElement('div');
  toggles.className = 'settings-toggles';

  const row1 = document.createElement('div');
  row1.className = 'settings-toggle-row';
  const cb1 = document.createElement('input');
  cb1.id = 'emailSyncToggle';
  cb1.type = 'checkbox';
  cb1.checked = emailSync;
  cb1.className = 'settings-checkbox';
  cb1.onchange = (e) => { emailSync = e.target.checked; };
  const label1 = document.createElement('label');
  label1.htmlFor = 'emailSyncToggle';
  label1.className = 'settings-toggle-label';
  label1.innerHTML = '<strong>Enable Gmail Sync:</strong> Periodically refresh academic message headers and preview snippets.';
  row1.appendChild(cb1);
  row1.appendChild(label1);

  const row2 = document.createElement('div');
  row2.className = 'settings-toggle-row';
  const cb2 = document.createElement('input');
  cb2.id = 'aiFeaturesToggle';
  cb2.type = 'checkbox';
  cb2.checked = aiFeatures;
  cb2.className = 'settings-checkbox';
  cb2.onchange = (e) => { aiFeatures = e.target.checked; };
  const label2 = document.createElement('label');
  label2.htmlFor = 'aiFeaturesToggle';
  label2.className = 'settings-toggle-label';
  label2.innerHTML = '<strong>Enable AI Assistant & Extraction:</strong> Allows rule-based and provider NLP analysis for candidate proposals.';
  row2.appendChild(cb2);
  row2.appendChild(label2);

  toggles.appendChild(row1);
  toggles.appendChild(row2);

  const notificationRows = [
    ['emailNotificationsToggle', 'emailNotifications', emailNotifications, (value) => { emailNotifications = value; }, 'Enable email notifications: Sends selected academic reminders to your account email through the configured notification provider.'],
    ['taskRemindersToggle', 'taskReminders', taskReminders, (value) => { taskReminders = value; }, 'Task reminders: Send email reminders for active tasks.'],
    ['deadlineRemindersToggle', 'deadlineReminders', deadlineReminders, (value) => { deadlineReminders = value; }, 'Assignment reminders: Send email reminders for upcoming deadlines.'],
    ['examRemindersToggle', 'examReminders', examReminders, (value) => { examReminders = value; }, 'Exam reminders: Send email reminders for examinations.'],
    ['overdueRemindersToggle', 'overdueReminders', overdueReminders, (value) => { overdueReminders = value; }, 'Overdue reminders: Send one email when an item becomes overdue.'],
    ['dailySummaryToggle', 'dailySummary', dailySummary, (value) => { dailySummary = value; }, 'Daily agenda: Enable the optional daily summary email.'],
  ];
  notificationRows.forEach(([id, name, checked, onChange, text]) => {
    const row = document.createElement('div');
    row.className = 'settings-toggle-row';
    const checkbox = document.createElement('input');
    checkbox.id = id;
    checkbox.name = name;
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.className = 'settings-checkbox';
    checkbox.onchange = (e) => onChange(e.target.checked);
    const label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'settings-toggle-label';
    label.textContent = text;
    row.appendChild(checkbox);
    row.appendChild(label);
    toggles.appendChild(row);
  });
  form.appendChild(toggles);

  const saveActions = document.createElement('div');
  saveActions.className = 'settings-save-actions';
  const saveBtn = Button({ children: 'Save Preferences', variant: 'primary', isLoading: isSaving, type: 'submit', icon: 'save' });
  saveActions.appendChild(saveBtn);
  form.appendChild(saveActions);

  container.appendChild(form);

  const dataCard = document.createElement('div');
  dataCard.className = 'card settings-data-card';
  const headerRow = document.createElement('div');
  headerRow.className = 'settings-data-header';
  headerRow.appendChild(icon('shield'));
  const h3 = document.createElement('h2');
  h3.className = 'settings-section-title';
  h3.textContent = 'Privacy, Consent & Data Governance';
  headerRow.appendChild(h3);
  dataCard.appendChild(headerRow);

  const content = document.createElement('div');
  content.className = 'settings-data-content';

  const item1 = document.createElement('div');
  item1.className = 'settings-data-item';
  const item1Title = document.createElement('div');
  item1Title.className = 'settings-data-item-title';
  item1Title.appendChild(icon('mail'));
  item1Title.appendChild(document.createTextNode(' What Gmail Data is Accessed?'));
  const item1P = document.createElement('p');
  item1P.innerHTML = 'When you connect Gmail, StudentOS requests strictly <strong>read-only scope (<code>gmail.readonly</code>)</strong>. We only fetch recent message headers (sender, subject, date) and brief snippets. We <strong>never download full email bodies</strong> or attachments by default, and we never request permission to send, edit, or delete your emails.';
  item1.appendChild(item1Title);
  item1.appendChild(item1P);

  const item2 = document.createElement('div');
  item2.className = 'settings-data-item';
  const item2Title = document.createElement('div');
  item2Title.className = 'settings-data-item-title';
  item2Title.appendChild(icon('lock'));
  item2Title.appendChild(document.createTextNode(' How Are Tokens Stored?'));
  const item2P = document.createElement('p');
  item2P.textContent = 'OAuth access and refresh tokens are encrypted using Fernet with a server-configured key. Raw credentials are not shown in the app.';
  item2.appendChild(item2Title);
  item2.appendChild(item2P);

  const item3 = document.createElement('div');
  item3.className = 'settings-data-item';
  const item3Title = document.createElement('div');
  item3Title.className = 'settings-data-item-title';
  item3Title.appendChild(icon('bot'));
  item3Title.appendChild(document.createTextNode(' How Does AI Processing Work?'));
  const item3P = document.createElement('p');
  item3P.textContent = 'AI extraction creates proposals only; a task or deadline is not added until you approve it. The offline provider processes data on the StudentOS backend. If an external AI provider is configured, the relevant prompt and source text may be sent to that provider.';
  item3.appendChild(item3Title);
  item3.appendChild(item3P);

  const item4 = document.createElement('div');
  item4.className = 'settings-data-item';
  const item4Title = document.createElement('div');
  item4Title.className = 'settings-data-item-title';
  item4Title.appendChild(icon('database'));
  item4Title.appendChild(document.createTextNode(' Personal and shared data'));
  const item4P = document.createElement('p');
  item4P.textContent = 'Coursework, reminders, Gmail data, and assistant context are private to your account. Only documents you publish in a shared workspace library are available to that workspace\'s members.';
  item4.appendChild(item4Title);
  item4.appendChild(item4P);

  content.appendChild(item1);
  content.appendChild(item2);
  content.appendChild(item3);
  content.appendChild(item4);
  dataCard.appendChild(content);

  const clearDiv = document.createElement('div');
  clearDiv.className = 'settings-data-clear';
  const clearTitleDiv = document.createElement('div');
  const clearTitle = document.createElement('div');
  clearTitle.className = 'settings-data-clear-title';
  clearTitle.textContent = 'Email Data Controls';
  const clearDesc = document.createElement('div');
  clearDesc.className = 'settings-data-clear-desc';
  clearDesc.textContent = 'Clear stored email previews and disconnect the connected Google account.';
  clearTitleDiv.appendChild(clearTitle);
  clearTitleDiv.appendChild(clearDesc);
  const clearBtn = Button({ children: 'Clear Email Cache & Disconnect', variant: 'danger', size: 'sm', onClick: handleClearCachedEmails, icon: 'trash2' });
  clearDiv.appendChild(clearTitleDiv);
  clearDiv.appendChild(clearBtn);
  dataCard.appendChild(clearDiv);

  container.appendChild(dataCard);

  loadPrefs();
  return container;
}
