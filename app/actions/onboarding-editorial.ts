'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { logger } from '@/lib/logger';
import type {
  OnboardingSavePayload,
  OnboardingSaveResult,
  StudentJourneyData,
  TeacherStudioData,
} from '@/types/onboarding-editorial';

/**
 * `user_preferences` and `teacher_settings` are not in the generated DB types
 * yet — this narrow shape lets us upsert without reaching for `any`.
 */
type UntypedUpsertClient = {
  from: (table: string) => {
    upsert: (
      data: Record<string, unknown>,
      opts: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
};

const toNumberOrNull = (value: string): number | null => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

async function saveStudentPreferences(userId: string, student: StudentJourneyData): Promise<void> {
  const admin = createAdminClient() as unknown as UntypedUpsertClient;
  const { error } = await admin.from('user_preferences').upsert(
    {
      user_id: userId,
      goals: student.goals,
      skill_level: student.skillLevel,
      learning_style: [],
      daily_goal_minutes: student.dailyGoalMinutes,
    },
    { onConflict: 'user_id' }
  );
  // Non-fatal: profile role is already set, so the user can proceed.
  if (error) logger.error('[onboarding-editorial] preferences upsert failed', error);
}

async function saveTeacherSettings(profileId: string, teacher: TeacherStudioData): Promise<void> {
  const admin = createAdminClient() as unknown as UntypedUpsertClient;
  const { error } = await admin.from('teacher_settings').upsert(
    {
      profile_id: profileId,
      display_name: teacher.displayName.trim() || null,
      instrument: teacher.instrument.trim() || null,
      years_experience: toNumberOrNull(teacher.yearsExperience),
      studio_name: teacher.studioName.trim() || null,
      tagline: teacher.tagline.trim() || null,
      city: teacher.city.trim() || null,
      timezone: teacher.timezone.trim() || null,
      teaches: teacher.teaches,
      default_lesson_minutes: teacher.defaultLessonMinutes,
    },
    { onConflict: 'profile_id' }
  );
  if (error) logger.error('[onboarding-editorial] teacher_settings upsert failed', error);
}

/**
 * Persists the editorial onboarding answers. Unlike the legacy
 * `completeOnboarding`, this returns a result instead of redirecting, so the
 * wizard can show its "Done" step before navigating.
 */
export async function saveOnboardingEditorial(
  payload: OnboardingSavePayload
): Promise<OnboardingSaveResult> {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const isTeacher = payload.role === 'teacher';
  const firstName = user.user_metadata?.first_name || '';
  const lastName = user.user_metadata?.last_name || '';

  try {
    const { error: profileError } = await createAdminClient()
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        is_student: !isTeacher,
        is_teacher: isTeacher,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (profileError) {
      logger.error('[onboarding-editorial] profile update failed', profileError);
      return { error: 'Failed to update profile' };
    }

    if (isTeacher && payload.teacher) await saveTeacherSettings(user.id, payload.teacher);
    if (!isTeacher && payload.student) await saveStudentPreferences(user.id, payload.student);
  } catch (error) {
    logger.error('[onboarding-editorial] unexpected error', error);
    return { error: 'An unexpected error occurred' };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
