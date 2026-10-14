'use server';

/**
 * Transcript → lesson draft: generate / discard, and the two text accepts
 * (lesson notes, next-lesson plan). Song and homework accepts live in
 * `transcript-draft-accept.ts`. Nothing here writes without a click.
 */

import { revalidatePath } from 'next/cache';

import { logger } from '@/lib/logger';
import {
  discardTranscriptDraft,
  generateTranscriptDraft,
  markDraftItemAccepted,
} from '@/lib/services/transcript-draft';
import { appendNotes } from '@/lib/services/transcript-draft.helpers';
import {
  authorizeDraftAction,
  draftNextLessonSchema,
  draftNotesSchema,
  fail,
  findNextScheduledLesson,
  lessonIdSchema,
  type DraftActionResult,
} from './transcript-draft.helpers';

const describe = (e: unknown) => (e instanceof Error ? e.message : 'Unexpected error');

export async function generateTranscriptDraftAction(
  lessonId: string
): Promise<DraftActionResult<{ noTranscript?: true }>> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  if (!id.success) return fail('Invalid lesson id');

  try {
    const record = await generateTranscriptDraft(auth.supabase, id.data, auth.profileId);
    revalidatePath(`/dashboard/lessons/${id.data}`);
    return record ? { ok: true } : { ok: true, noTranscript: true };
  } catch (error: unknown) {
    logger.error('[transcript-draft] generate failed', {
      lessonId: id.data,
      error: describe(error),
    });
    return fail(describe(error));
  }
}

export async function discardTranscriptDraftAction(lessonId: string): Promise<DraftActionResult> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  if (!id.success) return fail('Invalid lesson id');

  try {
    await discardTranscriptDraft(auth.supabase, id.data);
    revalidatePath(`/dashboard/lessons/${id.data}`);
    return { ok: true };
  } catch (error: unknown) {
    return fail(describe(error));
  }
}

/** Appends the draft notes to `lessons.notes` after a `---` rule; never overwrites. */
export async function acceptDraftNotesAction(
  lessonId: string,
  notes: string
): Promise<DraftActionResult> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  const text = draftNotesSchema.safeParse(notes);
  if (!id.success || !text.success) return fail('Invalid input');

  const { supabase } = auth;
  const { data: lesson, error: loadError } = await supabase
    .from('lessons')
    .select('notes')
    .eq('id', id.data)
    .maybeSingle();
  if (loadError || !lesson) return fail(loadError?.message ?? 'Lesson not found');

  const { error } = await supabase
    .from('lessons')
    .update({ notes: appendNotes(lesson.notes as string | null, text.data) })
    .eq('id', id.data);
  if (error) return fail(error.message);

  await markDraftItemAccepted(supabase, id.data, { kind: 'notes' });
  revalidatePath(`/dashboard/lessons/${id.data}`);
  return { ok: true };
}

/** Appends one bullet to the student's next SCHEDULED lesson's notes. */
export async function acceptDraftNextLessonAction(
  lessonId: string,
  item: { index: number; text: string }
): Promise<DraftActionResult<{ noNextLesson?: true }>> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  const parsed = draftNextLessonSchema.safeParse(item);
  if (!id.success || !parsed.success) return fail('Invalid input');

  const { supabase } = auth;
  const { data: lesson } = await supabase
    .from('lessons')
    .select('student_id, scheduled_at')
    .eq('id', id.data)
    .maybeSingle();
  if (!lesson) return fail('Lesson not found');

  const next = await findNextScheduledLesson(
    supabase,
    lesson.student_id as string,
    lesson.scheduled_at as string
  );
  if (!next) return { ok: true, noNextLesson: true };

  const { error } = await supabase
    .from('lessons')
    .update({ notes: appendNotes(next.notes, `- ${parsed.data.text}`) })
    .eq('id', next.id);
  if (error) return fail(error.message);

  await markDraftItemAccepted(supabase, id.data, { kind: 'nextLesson', index: parsed.data.index });
  revalidatePath(`/dashboard/lessons/${id.data}`);
  revalidatePath(`/dashboard/lessons/${next.id}`);
  return { ok: true };
}
