export type AIGenerationType =
  | 'lesson_notes'
  | 'assignment'
  | 'email_draft'
  | 'post_lesson_summary'
  | 'student_progress'
  | 'admin_insights'
  | 'song_notes'
  | 'lesson_transcript_draft'
  | 'chat';

export interface AIGeneration {
  id: string;
  user_id: string;
  generation_type: AIGenerationType;
  agent_id: string | null;
  model_id: string | null;
  provider: string | null;
  input_params: Record<string, unknown>;
  output_content: string;
  is_successful: boolean;
  error_message: string | null;
  context_entity_type: string | null;
  context_entity_id: string | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIGenerationInsert {
  user_id: string;
  generation_type: AIGenerationType;
  agent_id?: string | null;
  model_id?: string | null;
  provider?: string | null;
  input_params: Record<string, unknown>;
  output_content: string;
  is_successful?: boolean;
  error_message?: string | null;
  context_entity_type?: string | null;
  context_entity_id?: string | null;
}

export interface AIGenerationFilters {
  generationType?: AIGenerationType;
  isStarred?: boolean;
  isSuccessful?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const GENERATION_TYPE_LABELS: Record<AIGenerationType, string> = {
  lesson_notes: 'Lesson Notes',
  assignment: 'Assignment',
  email_draft: 'Email Draft',
  post_lesson_summary: 'Post-Lesson Summary',
  student_progress: 'Student Progress',
  admin_insights: 'Admin Insights',
  song_notes: 'Song Notes',
  lesson_transcript_draft: 'Lesson Draft from Recording',
  chat: 'Chat',
};
