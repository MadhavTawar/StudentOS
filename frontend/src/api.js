const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.origin}/api/v1`;

class ApiClient {
  setWorkspaceId(workspaceId) {
    if (workspaceId) {
      localStorage.setItem('studentos_workspace_id', workspaceId);
    } else {
      localStorage.removeItem('studentos_workspace_id');
    }
  }

  getWorkspaceId() {
    return localStorage.getItem('studentos_workspace_id');
  }

  async request(endpoint, options = {}) {
    const headers = {
      ...(options.headers || {}),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (endpoint.startsWith('/knowledge/') || endpoint === '/ai/assistant/chat') {
      const workspaceId = this.getWorkspaceId();
      if (workspaceId) headers['X-Workspace-ID'] = workspaceId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      endpoint !== '/auth/me'
    ) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    if (!response.ok) {
      let errorMessage = `API Error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  login(data) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  getMe() {
    return this.request('/auth/me');
  }

  listWorkspaces() {
    return this.request('/workspaces/');
  }

  createWorkspace(name) {
    return this.request('/workspaces/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  createWorkspaceInvitation(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/invites`, {
      method: 'POST',
    });
  }

  acceptWorkspaceInvitation(token) {
    return this.request('/workspaces/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  listWorkspaceMembers(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/members`);
  }

  getWorkspaceBilling(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/billing`);
  }

  getDashboardOverview() {
    return this.request('/dashboard/overview');
  }

  listTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/tasks/${queryString}`);
  }

  createTask(task) {
    return this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  updateTask(id, updates) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  toggleTask(id) {
    return this.request(`/tasks/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  getTaskStats() {
    return this.request('/tasks/stats');
  }

  listGoals() {
    return this.request('/goals/');
  }

  createGoal(data) {
    return this.request('/goals/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateGoal(id, data) {
    return this.request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteGoal(id) {
    return this.request(`/goals/${id}`, { method: 'DELETE' });
  }

  addGoalMilestone(goalId, data) {
    return this.request(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateGoalMilestone(id, data) {
    return this.request(`/goals/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  listDeadlines(params = {}) {
    const query = new URLSearchParams();
    if (params.event_type) query.append('event_type', params.event_type);
    if (params.status) query.append('status', params.status);
    if (params.upcoming_only) query.append('upcoming_only', 'true');
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/deadlines/${queryString}`);
  }

  createDeadline(deadline) {
    return this.request('/deadlines/', {
      method: 'POST',
      body: JSON.stringify(deadline),
    });
  }

  checkDeadlineDuplicate(deadline) {
    return this.request('/deadlines/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(deadline),
    });
  }

  updateDeadline(id, updates) {
    return this.request(`/deadlines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  deleteDeadline(id) {
    return this.request(`/deadlines/${id}`, { method: 'DELETE' });
  }

  getGmailAuthUrl() {
    return this.request('/gmail/auth-url');
  }

  sendGmailCallback(code, state) {
    return this.request('/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  getGmailStatus() {
    return this.request('/gmail/status');
  }

  listGmailMessages(search) {
    const queryString = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/gmail/messages${queryString}`);
  }

  disconnectGmail() {
    return this.request('/gmail/disconnect', { method: 'POST' });
  }

  extractEmailCandidates(data) {
    return this.request('/ai/extract-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  listAICandidates(status = 'pending_review') {
    return this.request(`/ai/candidates?status=${status}`);
  }

  reviewAICandidate(id, action, modifications = {}) {
    return this.request(`/ai/candidates/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        modified_title: modifications.title,
        modified_due_date: modifications.suggested_due_date,
        modified_is_ambiguous: modifications.is_ambiguous,
        modified_original_date_text: modifications.original_date_text,
        modified_priority: modifications.priority,
        modified_category: modifications.category,
      }),
    });
  }

  chatAssistant(message) {
    return this.request('/ai/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  listReminders() {
    return this.request('/reminders/');
  }

  createReminder(reminder) {
    return this.request('/reminders/', {
      method: 'POST',
      body: JSON.stringify(reminder),
    });
  }

  dismissReminder(id) {
    return this.request(`/reminders/${id}/dismiss`, { method: 'POST' });
  }

  listNotifications(unreadOnly = false) {
    return this.request(`/reminders/notifications?unread_only=${unreadOnly}`);
  }

  markNotificationRead(id) {
    return this.request(`/reminders/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  dismissNotification(id) {
    return this.request(`/reminders/notifications/${id}`, { method: 'DELETE' });
  }

  getPreferences() {
    return this.request('/preferences/');
  }

  getAiProvider() {
    return this.request('/ai/provider');
  }

  updatePreferences(updates) {
    return this.request('/preferences/', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  getKnowledgeAccess() {
    return this.request('/knowledge/access');
  }

  listKnowledgeLibrary() {
    return this.request('/knowledge/library');
  }

  chatWithKnowledge(question) {
    return this.request('/knowledge/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  listKnowledgeDocuments() {
    return this.request('/knowledge/documents');
  }

  uploadKnowledgeDocument(formData) {
    return this.request('/knowledge/documents', {
      method: 'POST',
      body: formData,
    });
  }

  uploadKnowledgeVersion(documentId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/knowledge/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData,
    });
  }

  publishKnowledgeVersion(documentId, versionId) {
    return this.request(
      `/knowledge/documents/${documentId}/versions/${versionId}/publish`,
      { method: 'POST' },
    );
  }

  archiveKnowledgeDocument(documentId) {
    return this.request(`/knowledge/documents/${documentId}/archive`, {
      method: 'POST',
    });
  }

  downloadKnowledgeVersion(documentId, versionId) {
    const headers = {};
    const workspaceId = this.getWorkspaceId();
    if (workspaceId) headers['X-Workspace-ID'] = workspaceId;
    return fetch(
      `${API_BASE}/knowledge/documents/${documentId}/versions/${versionId}/download`,
      { credentials: 'include', headers },
    ).then(async (response) => {
      if (!response.ok) {
        let message = `API Error (${response.status})`;
        try {
          const errorData = await response.json();
          message = errorData.detail || errorData.message || message;
        } catch {
          // use status-based message
        }
        throw new Error(message);
      }
      return response.blob();
    });
  }
}

export const api = new ApiClient();
