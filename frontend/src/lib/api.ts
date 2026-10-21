import {
  AuthResponse,
  User,
  Task,
  TaskStats,
  Deadline,
  GmailStatus,
  EmailMessage,
  AICandidate,
  Reminder,
  InAppNotification,
  DashboardOverview,
  UserPreference,
  KnowledgeAccess,
  KnowledgeDocument,
  KnowledgeLibraryItem,
  KnowledgeChatResponse,
  Workspace,
  WorkspaceBilling,
  WorkspaceInvitation,
  WorkspaceMember,
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  `http://${window.location.hostname}:8000/api/v1`;

class ApiClient {
  setWorkspaceId(workspaceId: string | null) {
    if (workspaceId) {
      localStorage.setItem('studentos_workspace_id', workspaceId);
    } else {
      localStorage.removeItem('studentos_workspace_id');
    }
  }

  getWorkspaceId(): string | null {
    return localStorage.getItem('studentos_workspace_id');
  }

  private getToken(): string | null {
    return null;
  }

  clearToken() {
    localStorage.removeItem('studentos_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (endpoint.startsWith('/knowledge/')) {
      const workspaceId = this.getWorkspaceId();
      if (workspaceId) headers['X-Workspace-ID'] = workspaceId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Support HttpOnly cookies
    });

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      endpoint !== '/auth/me'
    ) {
      this.clearToken();
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
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; password: string; full_name: string }): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/workspaces/');
  }

  async createWorkspace(name: string): Promise<Workspace> {
    return this.request<Workspace>('/workspaces/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async createWorkspaceInvitation(workspaceId: string): Promise<WorkspaceInvitation> {
    return this.request<WorkspaceInvitation>(`/workspaces/${workspaceId}/invites`, {
      method: 'POST',
    });
  }

  async acceptWorkspaceInvitation(token: string): Promise<Workspace> {
    return this.request<Workspace>('/workspaces/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  }

  async getWorkspaceBilling(workspaceId: string): Promise<WorkspaceBilling> {
    return this.request<WorkspaceBilling>(`/workspaces/${workspaceId}/billing`);
  }

  // Dashboard
  async getDashboardOverview(): Promise<DashboardOverview> {
    return this.request<DashboardOverview>('/dashboard/overview');
  }

  // Tasks
  async listTasks(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.sort_order) query.append('sort_order', params.sort_order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Task[]>(`/tasks/${queryString}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.request<Task>('/tasks/', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async toggleTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async getTaskStats(): Promise<TaskStats> {
    return this.request<TaskStats>('/tasks/stats');
  }

  // Deadlines
  async listDeadlines(params?: { event_type?: string; status?: string; upcoming_only?: boolean }): Promise<Deadline[]> {
    const query = new URLSearchParams();
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.status) query.append('status', params.status);
    if (params?.upcoming_only) query.append('upcoming_only', 'true');

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Deadline[]>(`/deadlines/${queryString}`);
  }

  async createDeadline(deadline: Partial<Deadline>): Promise<Deadline> {
    return this.request<Deadline>('/deadlines/', {
      method: 'POST',
      body: JSON.stringify(deadline),
    });
  }

  async checkDeadlineDuplicate(deadline: Partial<Deadline>): Promise<{ is_duplicate: boolean; message?: string }> {
    return this.request<{ is_duplicate: boolean; message?: string }>('/deadlines/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(deadline),
    });
  }

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline> {
    return this.request<Deadline>(`/deadlines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteDeadline(id: string): Promise<void> {
    await this.request(`/deadlines/${id}`, { method: 'DELETE' });
  }

  // Gmail
  async getGmailAuthUrl(): Promise<{ auth_url: string; state: string }> {
    return this.request<{ auth_url: string; state: string }>('/gmail/auth-url');
  }

  async sendGmailCallback(code: string, state: string): Promise<GmailStatus> {
    return this.request<GmailStatus>('/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async getGmailStatus(): Promise<GmailStatus> {
    return this.request<GmailStatus>('/gmail/status');
  }

  async listGmailMessages(search?: string): Promise<{ messages: EmailMessage[]; total: number }> {
    const queryString = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{ messages: EmailMessage[]; total: number }>(`/gmail/messages${queryString}`);
  }

  async disconnectGmail(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/gmail/disconnect', { method: 'POST' });
  }

  // AI
  async extractEmailCandidates(data: {
    message_id: string;
    subject: string;
    snippet: string;
    sender: string;
  }): Promise<AICandidate[]> {
    return this.request<AICandidate[]>('/ai/extract-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listAICandidates(status = 'pending_review'): Promise<AICandidate[]> {
    return this.request<AICandidate[]>(`/ai/candidates?status=${status}`);
  }

  async reviewAICandidate(
    id: string,
    action: 'approve' | 'reject' | 'modify',
    modifications?: Partial<AICandidate>
  ): Promise<AICandidate> {
    return this.request<AICandidate>(`/ai/candidates/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        modified_title: modifications?.title,
        modified_due_date: modifications?.suggested_due_date,
        modified_priority: modifications?.priority,
        modified_category: modifications?.category,
      }),
    });
  }

  async chatAssistant(message: string): Promise<{ reply: string; provider: string }> {
    return this.request<{ reply: string; provider: string }>('/ai/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Reminders & Notifications
  async listReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>('/reminders/');
  }

  async createReminder(reminder: Partial<Reminder>): Promise<Reminder> {
    return this.request<Reminder>('/reminders/', {
      method: 'POST',
      body: JSON.stringify(reminder),
    });
  }

  async dismissReminder(id: string): Promise<Reminder> {
    return this.request<Reminder>(`/reminders/${id}/dismiss`, { method: 'POST' });
  }

  async listNotifications(unreadOnly = false): Promise<InAppNotification[]> {
    return this.request<InAppNotification[]>(`/reminders/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(id: string): Promise<InAppNotification> {
    return this.request<InAppNotification>(`/reminders/notifications/${id}/read`, { method: 'PATCH' });
  }

  async dismissNotification(id: string): Promise<void> {
    await this.request(`/reminders/notifications/${id}`, { method: 'DELETE' });
  }

  // Preferences
  async getPreferences(): Promise<UserPreference> {
    return this.request<UserPreference>('/preferences/');
  }

  async updatePreferences(updates: Partial<UserPreference>): Promise<UserPreference> {
    return this.request<UserPreference>('/preferences/', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Institute knowledge
  async getKnowledgeAccess(): Promise<KnowledgeAccess> {
    return this.request<KnowledgeAccess>('/knowledge/access');
  }

  async listKnowledgeLibrary(): Promise<KnowledgeLibraryItem[]> {
    return this.request<KnowledgeLibraryItem[]>('/knowledge/library');
  }

  async chatWithKnowledge(question: string): Promise<KnowledgeChatResponse> {
    return this.request<KnowledgeChatResponse>('/knowledge/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
    return this.request<KnowledgeDocument[]>('/knowledge/documents');
  }

  async uploadKnowledgeDocument(formData: FormData): Promise<KnowledgeDocument> {
    return this.request<KnowledgeDocument>('/knowledge/documents', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadKnowledgeVersion(documentId: string, file: File): Promise<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<KnowledgeDocument>(`/knowledge/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData,
    });
  }

  async publishKnowledgeVersion(documentId: string, versionId: string): Promise<KnowledgeDocument> {
    return this.request<KnowledgeDocument>(
      `/knowledge/documents/${documentId}/versions/${versionId}/publish`,
      { method: 'POST' },
    );
  }

  async archiveKnowledgeDocument(documentId: string): Promise<KnowledgeDocument> {
    return this.request<KnowledgeDocument>(`/knowledge/documents/${documentId}/archive`, {
      method: 'POST',
    });
  }

  async downloadKnowledgeVersion(documentId: string, versionId: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    const workspaceId = this.getWorkspaceId();
    if (workspaceId) headers['X-Workspace-ID'] = workspaceId;
    const response = await fetch(
      `${API_BASE}/knowledge/documents/${documentId}/versions/${versionId}/download`,
      { credentials: 'include', headers },
    );
    if (!response.ok) {
      let message = `API Error (${response.status})`;
      try {
        const errorData = await response.json();
        message = errorData.detail || errorData.message || message;
      } catch {
        // Use the status-based message if the response is not JSON.
      }
      throw new Error(message);
    }
    return response.blob();
  }
}

export const api = new ApiClient();
