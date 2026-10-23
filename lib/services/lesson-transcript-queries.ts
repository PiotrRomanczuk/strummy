import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { TranscriptSource } from '@/schemas/LessonTranscriptSchema';
import {
  resolvedLessonDraftSchema,
  type ResolvedLessonDraft,
} from '@/lib/ai/schemas/lesson-transcript-draft';

export type LessonTranscriptDraftState = {
  status: 'none' | 'ready' | 'failed' | 'applied' | 'dismissed';
  /** null when missing or no longer matching the schema (then it can be regenerated). */
  content: ResolvedLessonDraft | null;
  error: string | null;
  generatedAt: string | null;
  appliedAt: string | null;
};

export type LessonTranscript = {
  id: string;
  source: TranscriptSource;
  recordedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  body: string;
  language: string;
  shareLink: string | null;
  draft: LessonTranscriptDraftState;
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
    .select(
      'id, source, recorded_at, ended_at, summary, body, language, share_link, draft, draft_status, draft_error, draft_generated_at, draft_applied_at'
    )
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
    draft: {
      status: data.draft_status as LessonTranscriptDraftState['status'],
      content: resolvedLessonDraftSchema.safeParse(data.draft).data ?? null,
      error: data.draft_error,
      generatedAt: data.draft_generated_at,
      appliedAt: data.draft_applied_at,
    },
  };
}
