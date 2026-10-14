import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { TranscriptSource } from '@/schemas/LessonTranscriptSchema';

export type LessonTranscript = {
  id: string;
  source: TranscriptSource;
  recordedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  body: string;
  language: string;
  shareLink: string | null;
};

/**
 * The lesson's transcript for the lesson detail page. Goes through the
 * cookie client on purpose: RLS (`can_manage_lesson`) is what keeps a student
 * from ever reading it — the page only renders the card for `canEdit`, but
 * the row itself never leaves the database for anyone else.
 */
export async function getLessonTranscript(lessonId: string): Promise<LessonTranscript | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_transcripts')
    .select('id, source, recorded_at, ended_at, summary, body, language, share_link')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) {
    logger.warn('[lesson-transcript-queries] transcript error', {
      error: error.message,
      code: error.code,
    });
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    source: data.source,
    recordedAt: data.recorded_at,
    endedAt: data.ended_at,
    summary: data.summary,
    body: data.body,
    language: data.language,
    shareLink: data.share_link,
  };
}
