'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { generateLessonSummary, saveLessonSummary, sendLessonSummary } from '@/lib/services/lesson-summary';
import { managedLessonClient } from '@/lib/services/lesson-transcript-draft-access';

/**
 * Server actions behind the "Podsumowanie lekcji" card. Same services and the
 * same owner check as /api/lessons/[id]/summary.
 */

export type SummaryActionResult = { success: true; summary: string; sent?: boolean; isTemplate?: boolean } | { success: false; error: string };

const lessonIdSchema = z.string().uuid();
const textSchema = z.string().trim().min(1).max(4000);

async function accessFor(lessonId: string) {
  const user = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(user.isDevelopment);
  if (guard) return { ok: false as const, error: guard.error };
  if (!user.profileId || !lessonIdSchema.safeParse(lessonId).success) return { ok: false as const, error: 'Lesson not found' };
  const access = await managedLessonClient(lessonId, {
    profileId: user.profileId,
    roles: { isAdmin: user.isAdmin, isTeacher: user.isTeacher },
  });
  return access.ok ? { ...access, profileId: user.profileId } : { ok: false as const, error: access.error };
}

export async function generateLessonSummaryAction(lessonId: string): Promise<SummaryActionResult> {
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const result = await generateLessonSummary(access.supabase, lessonId, access.profileId);
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  return result.ok ? { success: true, summary: result.summary, isTemplate: result.isTemplate } : { success: false, error: result.message };
}

export async function saveLessonSummaryAction(lessonId: string, text: string): Promise<SummaryActionResult> {
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const parsed = textSchema.safeParse(text);
  if (!parsed.success) return { success: false, error: 'Empty or too long' };
  await saveLessonSummary(access.supabase, lessonId, parsed.data);
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  return { success: true, summary: parsed.data };
}

/** Saves the text as shown in the editor, then e-mails it to the student. */
export async function sendLessonSummaryAction(lessonId: string, text: string): Promise<SummaryActionResult> {
  const saved = await saveLessonSummaryAction(lessonId, text);
  if (!saved.success) return saved;
  const access = await accessFor(lessonId);
  if (!access.ok) return { success: false, error: access.error };
  const result = await sendLessonSummary(access.supabase, lessonId);
  revalidatePath(`/dashboard/lessons/${lessonId}`);
  return result.ok ? { success: true, summary: result.summary, sent: result.sent } : { success: false, error: result.message };
}
