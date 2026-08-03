// ── DB enum mirrors ──────────────────────────────────────────────

export type AIContextType =
  | 'general'
  | 'student'
  | 'lesson'
  | 'song'
  | 'assignment'
  | 'practice';

export type AIMessageRole = 'system' | 'user' | 'assistant';

// ── Row types ────────────────────────────────────────────────────

export interface AIConversation {
  id: string;
  profile_id: string;
  title: string | null;
  model_id: string;
  context_type: AIContextType;
  context_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIConversationMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  model_id: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  is_helpful: boolean | null;
  created_at: string;
}

// ── Insert types ─────────────────────────────────────────────────

export interface AIConversationInsert {
  title?: string | null;
  model_id: string;
  context_type?: AIContextType;
  context_id?: string | null;
}

export interface AIMessageInsert {
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  model_id?: string | null;
  tokens_used?: number | null;
  latency_ms?: number | null;
}

// ── View / list types ────────────────────────────────────────────

export interface AIConversationSummary {
  id: string;
  title: string | null;
  context_type: AIContextType;
  created_at: string;
  updated_at: string;
}

export interface AIConversationFilters {
  page?: number;
  pageSize?: number;
  isArchived?: boolean;
  contextType?: AIContextType;
}
