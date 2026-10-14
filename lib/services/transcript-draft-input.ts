/**
 * Inputs for the transcript → lesson draft: the anonymised transcript text
 * and the catalogue lookup for each song the model names.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import {
  anonymiseTranscript,
  resolveSongMatch,
  type SimilarSongRow,
  type SongResolution,
} from './transcript-draft.helpers';

type Db = SupabaseClient;

export type TranscriptDraftInput = {
  transcriptId: string;
  summary: string | null;
  body: string;
};

/** The lesson's transcript with the student's name replaced by `Uczeń`; `null` when there is none. */
export async function loadTranscriptInput(
  supabase: Db,
  lessonId: string
): Promise<TranscriptDraftInput | null> {
  const { data: transcript, error } = await supabase
    .from('lesson_transcripts')
    .select('id, summary, body')
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error) throw error;
  if (!transcript) return null;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('student_id, student:profiles!lessons_student_id_fkey(full_name, first_name)')
    .eq('id', lessonId)
    .maybeSingle();
  const student = (lesson?.student ?? null) as {
    full_name: string | null;
    first_name: string | null;
  } | null;
  const names = { fullName: student?.full_name ?? null, firstName: student?.first_name ?? null };
  return {
    transcriptId: transcript.id as string,
    summary: transcript.summary ? anonymiseTranscript(transcript.summary, names) : null,
    body: anonymiseTranscript(transcript.body as string, names),
  };
}

/** `find_similar_songs` per title — threshold 0.3, three hits, mapped by `resolveSongMatch`. */
export async function resolveSongs(supabase: Db, titles: string[]): Promise<SongResolution[]> {
  return Promise.all(
    titles.map(async (title) => {
      const { data, error } = await supabase.rpc('find_similar_songs', {
        search_title: title,
        threshold: 0.3,
        max_results: 3,
      });
      if (error) logger.warn('[transcript-draft] find_similar_songs failed', { title, error });
      return resolveSongMatch((data ?? null) as SimilarSongRow[] | null);
    })
  );
}
