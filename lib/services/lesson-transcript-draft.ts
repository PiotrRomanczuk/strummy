import type { SupabaseClient } from '@supabase/supabase-js';

import { generateLessonTranscriptDraft } from '@/lib/ai/agents/lesson-transcript-draft';
import type { DraftAttempt } from '@/lib/ai/agents/lesson-transcript-draft-fallback';
import { LESSON_DRAFT_PROMPT_VERSION } from '@/lib/ai/agents/lesson-transcript-draft-prompt';
import type { LessonTranscriptDraft, ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import { createLogger } from '@/lib/logger';

import { loadDraftContext, type DraftContext } from './lesson-transcript-draft-context';
import { matchDraftSong } from './lesson-transcript-draft-matching';

const log = createLogger('lesson-transcript-draft');

/**
 * Generates the "Szkic z nagrania" for a lesson (CNT-8): transcript → agent →
 * songs matched to the catalog, skills matched to the skills table → stored in
 * lesson_transcripts.draft for the teacher to review. Writes nothing else.
 *
 * The caller decides who may do this: the API route checks the teacher owns
 * the lesson before handing in an admin client; server actions pass the
 * cookie client and RLS (can_manage_lesson) does the same job.
 */

export type GenerateDraftOptions = {
  actorProfileId: string;
  /** Extra ways the student is called in the recording, beyond the profile name. */
  aliases?: string[];
};

export type GenerateDraftResult =
  | { ok: true; draft: ResolvedLessonDraft; model: string }
  | { ok: false; code: 'not_found' | 'already_applied' | 'generation_failed'; message: string };

async function resolveDraft(
  supabase: SupabaseClient,
  ctx: DraftContext,
  draft: LessonTranscriptDraft
): Promise<ResolvedLessonDraft> {
  const songs = await Promise.all(
    draft.songs.map(async (song) => ({ ...song, match: await matchDraftSong(supabase, song, ctx.knownSongs) }))
  );
  const skillIds = new Map(ctx.skills.map((s) => [s.name.toLowerCase(), s.id]));
  const skills = draft.skills.map((skill) => ({
    ...skill,
    skillId: skillIds.get(skill.skillName.toLowerCase()) ?? null,
  }));
  return { ...draft, songs, skills };
}

async function logGeneration(
  supabase: SupabaseClient,
  ctx: DraftContext,
  actorProfileId: string,
  outcome: { model: string; output: string; error?: string; attempts: DraftAttempt[] }
): Promise<void> {
  // The transcript itself never goes to ai_generations; the model's answers do
  // (attempts[].raw), failed ones included — the material for comparing models.
  const { error } = await supabase.from('ai_generations').insert({
    profile_id: actorProfileId,
    generation_type: 'lesson_transcript_draft',
    agent_id: 'lesson-transcript-draft',
    model_id: outcome.model,
    provider: 'openrouter',
    input_params: {
      lessonId: ctx.lesson.id,
      transcriptChars: ctx.transcript.body.length,
      promptVersion: LESSON_DRAFT_PROMPT_VERSION,
      attempts: outcome.attempts,
    },
    output_content: outcome.output,
    is_successful: !outcome.error,
    error_message: outcome.error ?? null,
    context_entity_type: 'lesson',
    context_entity_id: ctx.lesson.id,
  });
  if (error) log.warn('[lesson-transcript-draft] ai_generations insert failed', { error: error.message });
}

export async function generateLessonDraft(
  supabase: SupabaseClient,
  lessonId: string,
  options: GenerateDraftOptions
): Promise<GenerateDraftResult> {
  const ctx = await loadDraftContext(supabase, lessonId, options.aliases);
  if (!ctx) return { ok: false, code: 'not_found', message: 'Lesson or transcript not found' };
  if (ctx.transcript.draftStatus === 'applied') {
    return { ok: false, code: 'already_applied', message: 'This draft was already applied to the lesson' };
  }

  const result = await generateLessonTranscriptDraft({
    transcript: ctx.transcript.body,
    summary: ctx.transcript.summary,
    lessonDate: ctx.lesson.scheduledAt.slice(0, 10),
    studentNames: ctx.studentNames,
    teacherNames: ctx.teacherNames,
    knownSongs: ctx.knownSongs,
    skillCatalog: ctx.skills.map((s) => s.name),
  });

  const now = new Date().toISOString();
  if (!result.success) {
    await supabase
      .from('lesson_transcripts')
      .update({ draft_status: 'failed', draft_error: result.error.slice(0, 1000), draft_model: result.model, draft_generated_at: now })
      .eq('id', ctx.transcript.id);
    await logGeneration(supabase, ctx, options.actorProfileId, {
      model: result.model,
      output: result.attempts.at(-1)?.raw ?? '',
      error: result.error,
      attempts: result.attempts,
    });
    return { ok: false, code: 'generation_failed', message: result.error };
  }

  const draft = await resolveDraft(supabase, ctx, result.data);
  const { error } = await supabase
    .from('lesson_transcripts')
    .update({ draft, draft_status: 'ready', draft_error: null, draft_model: result.model, draft_generated_at: now })
    .eq('id', ctx.transcript.id);
  if (error) throw new Error(`lesson-transcript-draft: saving draft failed (${error.message})`);

  await logGeneration(supabase, ctx, options.actorProfileId, {
    model: result.model,
    output: JSON.stringify(draft),
    attempts: result.attempts,
  });
  log.info('[lesson-transcript-draft] draft ready', {
    lessonId,
    songs: draft.songs.length,
    matchedSongs: draft.songs.filter((s) => s.match.songId).length,
    hasAssignment: draft.assignment !== null,
  });
  return { ok: true, draft, model: result.model };
}
