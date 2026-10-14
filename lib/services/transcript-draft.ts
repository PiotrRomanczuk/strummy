/**
 * Transcript → lesson draft service (CNT-6 / CNT-8).
 *
 * Generates the draft from the stored transcript and keeps it in
 * `ai_workflow_runs` (`workflow_type = 'transcript-draft'`, one stage,
 * status `awaiting_review`) until the teacher discards it or regenerates.
 * Written directly rather than through `lib/ai/workflows/engine.ts`: the
 * engine's step executors have no database handle, and song resolution
 * needs one. The row shape is the engine's, so the table stays one thing.
 *
 * Every function takes the caller's RLS client — `can_manage_lesson` is the
 * boundary, not this file.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { generateTranscriptLessonDraft } from '@/lib/ai/agents/transcript-lesson-draft';
import { loadTranscriptInput, resolveSongs } from './transcript-draft-input';
import {
  EMPTY_ACCEPTED,
  markAccepted,
  TRANSCRIPT_DRAFT_WORKFLOW,
  type StoredTranscriptDraft,
  type TranscriptDraftRecord,
} from './transcript-draft.helpers';

type Db = SupabaseClient;
const ACTIVE = ['running', 'awaiting_review'];

async function findActiveRun(supabase: Db, lessonId: string) {
  const { data, error } = await supabase
    .from('ai_workflow_runs')
    .select('id, step_results')
    .eq('lesson_id', lessonId)
    .eq('workflow_type', TRANSCRIPT_DRAFT_WORKFLOW)
    .in('status', ACTIVE)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; step_results: { draft?: StoredTranscriptDraft } } | null;
}

async function saveDraft(supabase: Db, runId: string, draft: StoredTranscriptDraft) {
  const { error } = await supabase
    .from('ai_workflow_runs')
    .update({ step_results: { draft } })
    .eq('id', runId);
  if (error) throw error;
}

/** Returns `null` when the lesson has no transcript. Replaces any earlier draft. */
export async function generateTranscriptDraft(
  supabase: Db,
  lessonId: string,
  createdBy: string
): Promise<TranscriptDraftRecord | null> {
  const input = await loadTranscriptInput(supabase, lessonId);
  if (!input) return null;

  const { draft, model } = await generateTranscriptLessonDraft(input);
  const resolvedSongs = await resolveSongs(
    supabase,
    draft.songs.map((s) => s.title)
  );
  const stored: StoredTranscriptDraft = {
    draft,
    resolvedSongs,
    generatedAt: new Date().toISOString(),
    model,
    accepted: EMPTY_ACCEPTED,
  };

  await discardTranscriptDraft(supabase, lessonId);
  const { data, error } = await supabase
    .from('ai_workflow_runs')
    .insert({
      workflow_type: TRANSCRIPT_DRAFT_WORKFLOW,
      lesson_id: lessonId,
      created_by: createdBy,
      status: 'awaiting_review',
      current_step: 'review',
      input: { transcriptId: input.transcriptId, model },
      step_results: { draft: stored },
    })
    .select('id')
    .single();
  if (error) throw error;
  return { ...stored, runId: data.id as string };
}

export async function getTranscriptDraft(
  supabase: Db,
  lessonId: string
): Promise<TranscriptDraftRecord | null> {
  const run = await findActiveRun(supabase, lessonId);
  const draft = run?.step_results?.draft;
  if (!run || !draft) return null;
  return { ...draft, accepted: draft.accepted ?? EMPTY_ACCEPTED, runId: run.id };
}

/** Marks the active run `done` — the card disappears, the row stays for the audit trail. */
export async function discardTranscriptDraft(supabase: Db, lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_workflow_runs')
    .update({ status: 'done' })
    .eq('lesson_id', lessonId)
    .eq('workflow_type', TRANSCRIPT_DRAFT_WORKFLOW)
    .in('status', ACTIVE);
  if (error) throw error;
}

/** Records that one item was accepted so the card can show ✓ after a refresh. */
export async function markDraftItemAccepted(
  supabase: Db,
  lessonId: string,
  item: Parameters<typeof markAccepted>[1]
): Promise<void> {
  const record = await getTranscriptDraft(supabase, lessonId);
  if (!record) return;
  const { runId, ...stored } = record;
  await saveDraft(supabase, runId, { ...stored, accepted: markAccepted(stored.accepted, item) });
}
