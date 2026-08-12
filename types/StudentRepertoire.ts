import type { Song } from '@/components/songs/types';

export type RepertoirePriority = 'high' | 'normal' | 'low' | 'archived';
export type SongProgressStatus = 'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered';

export interface StudentRepertoire {
  id: string;
  student_id: string;
  song_id: string;

  // Student-specific config
  preferred_key: string | null;
  capo_fret: number | null;
  custom_strumming: string | null;
  student_notes: string | null;
  teacher_notes: string | null;

  // Progress
  current_status: SongProgressStatus;
  started_at: string | null;
  mastered_at: string | null;
  difficulty_rating: number | null;

  // Student self-assessment (1-5 confidence scale)
  self_rating: number | null;
  self_rating_updated_at: string | null;

  // Practice metrics
  total_practice_minutes: number;
  practice_session_count: number;
  last_practiced_at: string | null;

  // Management
  assigned_by: string | null;
  due_date: string | null;
  goal_text: string | null;
  sort_order: number;
  is_active: boolean;
  priority: RepertoirePriority;

  created_at: string;
  updated_at: string;
}

/** Repertoire entry with joined song data for display */
export interface StudentRepertoireWithSong extends StudentRepertoire {
  song: Pick<Song, 'id' | 'title' | 'author' | 'level' | 'key' | 'capo_fret' | 'strumming_pattern'>;
}

export type CreateRepertoireInput = {
  student_id: string;
  song_id: string;
  preferred_key?: string | null;
  capo_fret?: number | null;
  custom_strumming?: string | null;
  teacher_notes?: string | null;
  priority?: RepertoirePriority;
  assigned_by?: string;
  due_date?: string | null;
  goal_text?: string | null;
};

export type UpdateRepertoireInput = Partial<
  Pick<
    StudentRepertoire,
    | 'preferred_key'
    | 'capo_fret'
    | 'custom_strumming'
    | 'student_notes'
    | 'teacher_notes'
    | 'current_status'
    | 'difficulty_rating'
    | 'sort_order'
    | 'is_active'
    | 'priority'
  >
>;
