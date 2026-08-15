import type { SongLevel as SharedSongLevel } from '@/components/shared/level-label.helpers';

/**
 * Shared types for song components
 */

import type { Tables } from '@/lib/supabase';

export type Song = Tables<'songs'>;
export type SongSection = {
  id: string;
  song_id: string;
  section_type: string;
  section_number: number | null;
  order_position: number;
  chords: string[];
  lyrics: string | null;
  tab_notation: string | null;
  notes: string | null;
  created_at: string;
};
export type SongStatus = 'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered';

export type SongWithStatus = Song & {
  status?: SongStatus;
  lesson_song_id?: string;
  is_favorite?: boolean;
};

// Re-exported, not redefined: this used to be a second copy of the same union
// and went stale the moment songs gained a fourth level.
export type SongLevel = SharedSongLevel;

export type SongFilters = {
  level: SongLevel | null;
  key?: string | null;
  author?: string;
  search?: string;
  hasAudio?: boolean;
  hasChords?: boolean;
  studentId?: string | null;
};
