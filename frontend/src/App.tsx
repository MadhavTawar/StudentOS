import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { InboxPage } from './pages/InboxPage';
import { AssistantPage } from './pages/AssistantPage';
import { RemindersPage } from './pages/RemindersPage';
import { SettingsPage } from './pages/SettingsPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { KnowledgeAdminPage } from './pages/KnowledgeAdminPage';
import { MarketingHomePage } from './pages/MarketingHomePage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { BillingPage } from './pages/BillingPage';
import { JoinWorkspacePage } from './pages/JoinWorkspacePage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketingHomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/join" element={<JoinWorkspacePage />} />

          <Route path="/app" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="deadlines" element={<DeadlinesPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="knowledge/manage" element={<KnowledgeAdminPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="workspaces" element={<WorkspacesPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
