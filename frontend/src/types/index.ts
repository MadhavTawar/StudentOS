export interface UserPreference {
  id: string;
  user_id: string;
  timezone: string;
  theme: string;
  email_sync_enabled: boolean;
  ai_features_enabled: boolean;
  reminder_lead_minutes: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  preference?: UserPreference;
}

export interface KnowledgeAccess {
  is_admin: boolean;
  can_manage_documents: boolean;
  ai_provider: string;
}

export interface KnowledgeDocumentVersion {
  id: string;
  version_number: number;
  original_filename: string;
  status: 'processing' | 'ready' | 'published' | 'failed' | 'superseded' | 'archived';
  page_count: number;
  created_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  versions: KnowledgeDocumentVersion[];
}

export interface KnowledgeLibraryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  version_id: string;
  version_number: number;
  page_count: number;
  published_at: string;
}

export interface KnowledgeCitation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  version_id: string;
  version_number: number;
  page_start?: number | null;
  page_end?: number | null;
  excerpt: string;
}

export interface KnowledgeChatResponse {
  answer: string;
  insufficient_evidence: boolean;
  citations: KnowledgeCitation[];
}

export interface DocumentManager {
  user_id: string;
  email: string;
  full_name: string;
  role: 'document_manager';
  granted_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  workspace_type: 'personal' | 'organization';
  is_personal: boolean;
  role: 'owner' | 'admin' | 'member';
  plan_code: string;
  subscription_status: string;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface WorkspaceInvitation {
  workspace_id: string;
  invited_email?: string | null;
  token: string;
  expires_at: string;
}

export interface WorkspaceBilling {
  plan_code: string;
  status: string;
  billing_provider?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  payment_provider_configured: boolean;
}

export interface AuthResponse {
  user: User;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  timezone: string;
  estimated_duration?: number;
  source_type: 'manual' | 'gmail' | 'ai_proposal';
  source_ref?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_today: number;
}

export interface Deadline {
  id: string;
  user_id: string;
  task_id?: string;
  title: string;
  description?: string;
  event_type: string;
  due_date: string;
  timezone: string;
  status: 'Upcoming' | 'Due Soon' | 'Completed' | 'Overdue';
  is_ambiguous: boolean;
  original_date_text?: string;
  source_type: string;
  source_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: string;
  message_id: string;
  thread_id?: string;
  sender: string;
  recipient?: string;
  subject: string;
  snippet?: string;
  internal_date: string;
  is_read: boolean;
  has_extracted_candidates: boolean;
}

export interface GmailStatus {
  is_connected: boolean;
  email_address?: string;
  last_synced_at?: string;
  scopes?: string;
  message_count: number;
}

export interface AICandidate {
  id: string;
  source_email_id: string;
  email_subject: string;
  email_sender: string;
  candidate_type: 'task' | 'deadline';
  title: string;
  description?: string;
  suggested_due_date?: string | null;
  category: string;
  priority: TaskPriority;
  supporting_evidence: string;
  confidence_score: number;
  validation_status: 'pending_review' | 'approved' | 'rejected' | 'modified';
  created_task_id?: string;
  created_deadline_id?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  task_id?: string;
  deadline_id?: string;
  remind_at: string;
  lead_time_minutes: number;
  status: string;
  title: string;
  message?: string;
  created_at: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  reminder_id?: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  dismissed: boolean;
  created_at: string;
}

export interface DashboardOverview {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  stats: TaskStats;
  upcoming_deadlines: Deadline[];
  pending_tasks: Task[];
  overdue_tasks: Task[];
  recent_emails: EmailMessage[];
  ai_proposals: AICandidate[];
  unread_notifications_count: number;
  gmail_connected: boolean;
  gmail_email?: string;
}
