/**
 * Shared bits for the transcript-draft server actions: the auth gate every
 * action runs first, the Zod inputs, and the "next scheduled lesson" lookup
 * two accept actions need.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { SONG_PROGRESS_STATUSES } from '@/lib/ai/schemas/transcript-draft';

export type DraftActionResult<T extends object = Record<never, never>> =
  ({ ok: true } & T) | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const lessonIdSchema = z.string().uuid();
export const draftNotesSchema = z.string().trim().min(1).max(2000);
export const draftSongSchema = z.object({
  index: z.number().int().min(0).max(7),
  songId: z.string().uuid(),
  status: z.enum(SONG_PROGRESS_STATUSES),
});
export const draftHomeworkSchema = z.object({
  index: z.number().int().min(0).max(4),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
  songId: z.string().uuid().optional(),
});
export const draftNextLessonSchema = z.object({
  index: z.number().int().min(0).max(4),
  text: z.string().trim().min(1).max(300),
});

/** Teacher/admin, not a blocked test account; hands back the RLS client. */
export async function authorizeDraftAction(): Promise<
  { ok: true; supabase: SupabaseClient; profileId: string } | { ok: false; error: string }
> {
  const { user, profileId, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return fail(guard.error);
  if (!user || !profileId) return fail('Unauthorized');
  if (!isAdmin && !isTeacher) return fail('Only teachers and admins can review drafts');
  const supabase = await createClient();
  return { ok: true, supabase: supabase as unknown as SupabaseClient, profileId };
}

/** The student's next SCHEDULED lesson after `afterIso` (defaults to now). */
export async function findNextScheduledLesson(
  supabase: SupabaseClient,
  studentId: string,
  afterIso: string = new Date().toISOString()
): Promise<{ id: string; scheduledAt: string; notes: string | null } | null> {
  const { data } = await supabase
    .from('lessons')
    .select('id, scheduled_at, notes')
    .eq('student_id', studentId)
    .eq('status', 'SCHEDULED')
    .gt('scheduled_at', afterIso)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    scheduledAt: data.scheduled_at as string,
    notes: data.notes as string | null,
  };
}

/** Due date for homework from this lesson: the next scheduled lesson, else +7 days. */
export async function homeworkDueDate(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const next = await findNextScheduledLesson(supabase, studentId);
  return next?.scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}
