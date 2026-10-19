'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { generateLessonDraft } from '@/lib/services/lesson-transcript-draft';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';
import { applyLessonDraft } from '@/lib/services/lesson-transcript-draft-apply';
import { LessonDraftApplySchema, type LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

/**
 * Server actions behind the "Szkic z nagrania" card (CNT-8). Same services and
 * the same owner check as /api/lessons/[id]/transcript-draft — the card and
 * an API-key client can never disagree about who may do what.
 */

type ActionResult = { success: true } | { success: false; error: string };

const lessonIdSchema = z.string().uuid();
const aliasesSchema = z.array(z.string().trim().min(2).max(60)).max(10);

async function accessFor(lessonId: string) {
  const user = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(user.isDevelopment);
  if (guard) return { ok: false as const, error: guard.error };
  if (!user.profileId || !lessonIdSchema.safeParse(lessonId).success) {
    return { ok: false as const, error: 'Lesson not found' };
  }
  const access = await managedLessonClient(lessonId, {
    profileId: user.profileId,
    roles: { isAdmin: user.isAdmin, isTeacher: user.isTeacher },
  });
  return access.ok ? { ...access, profileId: user.profileId } : { ok: false as const, error: access.error };
}

export async function generateLessonDraftAction(lessonId: string, aliases: string[] = []): Promise<ActionResult> {
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const parsedAliases = aliasesSchema.safeParse(aliases);
  if (!parsedAliases.success) return { success: false, error: 'Invalid aliases' };

  const result = await generateLessonDraft(access.supabase, lessonId, {
    actorProfileId: access.profileId,
    aliases: parsedAliases.data,
  });
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  return result.ok ? { success: true } : { success: false, error: result.message };
}

export async function applyLessonDraftAction(lessonId: string, selection: LessonDraftApply): Promise<ActionResult> {
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const parsed = LessonDraftApplySchema.safeParse(selection);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid selection' };

  const result = await applyLessonDraft(access.supabase, lessonId, parsed.data);
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  revalidatePath('/dashboard/assignments');
  return result.ok ? { success: true } : { success: false, error: result.message };
}

export async function dismissLessonDraftAction(lessonId: string): Promise<ActionResult> {
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const { error } = await access.supabase
    .from('lesson_transcripts')
    .update({ draft_status: 'dismissed' })
    .eq('lesson_id', lessonId)
    .in('draft_status', ['ready', 'failed']);
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  return error ? { success: false, error: error.message } : { success: true };
}
