import { router } from './router.js';
import { auth } from './auth.js';

import { render as MarketingHomePage } from './pages/MarketingHomePage.js';
import { render as LoginPage } from './pages/LoginPage.js';
import { render as RegisterPage } from './pages/RegisterPage.js';
import { render as OAuthCallbackPage } from './pages/OAuthCallbackPage.js';
import { render as JoinWorkspacePage } from './pages/JoinWorkspacePage.js';
import { render as DashboardPage } from './pages/DashboardPage.js';
import { render as PlannerPage } from './pages/PlannerPage.js';
import { render as GoalsPage } from './pages/GoalsPage.js';
import { render as InboxPage } from './pages/InboxPage.js';
import { render as LearnPage } from './pages/LearnPage.js';
import { render as KnowledgePage } from './pages/KnowledgePage.js';
import { render as KnowledgeAdminPage } from './pages/KnowledgeAdminPage.js';
import { render as RemindersPage } from './pages/RemindersPage.js';
import { render as SettingsPage } from './pages/SettingsPage.js';
import { render as WorkspacesPage } from './pages/WorkspacesPage.js';
import { render as BillingPage } from './pages/BillingPage.js';

function requireAuth(component) {
  return {
    render() {
      if (!auth.isAuthenticated) {
        router.navigate('/login');
        return document.createElement('div');
      }
      return component();
    },
  };
}

export function registerRoutes() {
  router.add('/', MarketingHomePage);
  router.add('/login', LoginPage);
  router.add('/register', RegisterPage);
  router.add('/oauth/callback', OAuthCallbackPage);
  router.add('/join', JoinWorkspacePage);

  router.add('/app', requireAuth(DashboardPage));
  router.add('/app/planner', requireAuth(PlannerPage));
  router.add('/app/goals', requireAuth(GoalsPage));
  router.add('/app/tasks', {
    render() {
      router.navigate('/app/planner?view=tasks', { replace: true });
      return document.createElement('div');
    },
  });
  router.add('/app/deadlines', {
    render() {
      router.navigate('/app/planner?view=deadlines', { replace: true });
      return document.createElement('div');
    },
  });
  router.add('/app/inbox', requireAuth(InboxPage));
  router.add('/app/learn', requireAuth(LearnPage));
  router.add('/app/knowledge', requireAuth(KnowledgePage));
  router.add('/app/knowledge/manage', requireAuth(KnowledgeAdminPage));
  router.add('/app/assistant', {
    render() {
      router.navigate('/app/learn', { replace: true });
      return document.createElement('div');
    },
  });
  router.add('/app/reminders', requireAuth(RemindersPage));
  router.add('/app/settings', requireAuth(SettingsPage));
  router.add('/app/workspaces', requireAuth(WorkspacesPage));
  router.add('/app/billing', requireAuth(BillingPage));

  router.add('*', {
    render() {
      router.navigate('/');
      return document.createElement('div');
    },
  });
}
