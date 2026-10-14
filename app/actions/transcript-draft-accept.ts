'use server';

/**
 * Transcript → lesson draft: the two accepts that create records.
 * Songs go through the existing lesson-song actions (the lesson path of the
 * Song Progress two-path rule — the repertoire trigger does the rest);
 * homework goes through `createAssignmentAction` like every other assignment.
 */

import { revalidatePath } from 'next/cache';

import { updateLessonSongs, updateLessonSongStatus } from '@/app/dashboard/lessons/actions';
import { markDraftItemAccepted } from '@/lib/services/transcript-draft';
import { createAssignmentAction } from './assignment-edit';
import {
  authorizeDraftAction,
  draftHomeworkSchema,
  draftSongSchema,
  fail,
  homeworkDueDate,
  lessonIdSchema,
  type DraftActionResult,
} from './transcript-draft.helpers';

const describe = (e: unknown) => (e instanceof Error ? e.message : 'Unexpected error');

/** Adds the song to `lesson_songs` (keeping the others) and sets its status. */
export async function acceptDraftSongAction(
  lessonId: string,
  item: { index: number; songId: string; status: string }
): Promise<DraftActionResult> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  const parsed = draftSongSchema.safeParse(item);
  if (!id.success || !parsed.success) return fail('Invalid input');

  const { supabase } = auth;
  const { data: current, error } = await supabase
    .from('lesson_songs')
    .select('song_id')
    .eq('lesson_id', id.data);
  if (error) return fail(error.message);

  const currentIds = (current ?? []).map((r) => r.song_id as string);
  try {
    if (!currentIds.includes(parsed.data.songId)) {
      await updateLessonSongs(id.data, [...currentIds, parsed.data.songId]);
    }
    await updateLessonSongStatus(id.data, parsed.data.songId, parsed.data.status);
  } catch (e: unknown) {
    return fail(describe(e));
  }

  await markDraftItemAccepted(supabase, id.data, { kind: 'songs', index: parsed.data.index });
  revalidatePath(`/dashboard/lessons/${id.data}`);
  return { ok: true };
}

/** Creates an assignment due at the next scheduled lesson (or +7 days). */
export async function acceptDraftHomeworkAction(
  lessonId: string,
  studentId: string,
  item: { index: number; title: string; description?: string; songId?: string }
): Promise<DraftActionResult<{ assignmentId: string }>> {
  const auth = await authorizeDraftAction();
  if (!auth.ok) return auth;
  const id = lessonIdSchema.safeParse(lessonId);
  const student = lessonIdSchema.safeParse(studentId);
  const parsed = draftHomeworkSchema.safeParse(item);
  if (!id.success || !student.success || !parsed.success) return fail('Invalid input');

  const dueDate = await homeworkDueDate(auth.supabase, student.data);
  const result = await createAssignmentAction({
    studentId: student.data,
    lessonId: id.data,
    title: parsed.data.title,
    description: parsed.data.description,
    dueDate,
    songId: parsed.data.songId ?? null,
  });
  if ('error' in result) return fail(result.error);

  await markDraftItemAccepted(auth.supabase, id.data, {
    kind: 'homework',
    index: parsed.data.index,
  });
  revalidatePath(`/dashboard/lessons/${id.data}`);
  return { ok: true, assignmentId: result.assignmentId };
}
