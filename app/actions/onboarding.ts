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
} from '@/types/onboarding';

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

/**
 * Keyed by PROFILE id — `user_preferences.profile_id` is FK → profiles.id, not
 * auth.uid(). `skill_level` is intentionally absent: it is single-sourced on
 * profiles (20260727120000_skill_level_single_source).
 */
async function saveStudentPreferences(
  profileId: string,
  student: StudentJourneyData
): Promise<void> {
  const admin = createAdminClient() as unknown as UntypedUpsertClient;
  const { error } = await admin.from('user_preferences').upsert(
    {
      profile_id: profileId,
      goals: student.goals,
      learning_style: [],
      daily_goal_minutes: student.dailyGoalMinutes,
      instrument_preference: student.guitars,
    },
    { onConflict: 'profile_id' }
  );
  // Non-fatal: profile role is already set, so the user can proceed.
  if (error) logger.error('[onboarding] preferences upsert failed', error);
}

/**
 * Teachers answer the same "what do you play" question, and it lands in the
 * same column — `user_preferences` is keyed by profile id and is not
 * student-only. Kept separate from saveTeacherSettings because that writes
 * studio identity to a different table.
 */
async function saveTeacherInstruments(profileId: string, guitars: string[]): Promise<void> {
  if (guitars.length === 0) return;
  const admin = createAdminClient() as unknown as UntypedUpsertClient;
  const { error } = await admin
    .from('user_preferences')
    .upsert(
      { profile_id: profileId, instrument_preference: guitars },
      { onConflict: 'profile_id' }
    );
  if (error) logger.error('[onboarding] teacher instruments upsert failed', error);
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
  if (error) logger.error('[onboarding] teacher_settings upsert failed', error);
}

/**
 * Create the `profiles` row for an authenticated user that has none.
 *
 * Mirrors what `trigger_handle_new_user` writes on sign-up, so a row healed
 * here is indistinguishable from one created normally. Returns the new profile
 * id, or null if the insert failed (the caller reports the generic error).
 */
async function createMissingProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<string | null> {
  logger.warn('[onboarding] no profile row for authenticated user — creating one', {
    userId: user.id,
  });

  const { data, error } = await adminClient
    .from('profiles')
    .insert({
      user_id: user.id,
      email: user.email ?? '',
      first_name: (user.user_metadata?.first_name as string) || '',
      last_name: (user.user_metadata?.last_name as string) || '',
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('[onboarding] could not create missing profile', error);
    return null;
  }
  return data.id;
}

type RoleFlags = {
  is_student: boolean | null;
  is_teacher: boolean | null;
  is_admin: boolean | null;
  onboarding_completed: boolean | null;
};

/**
 * Onboarding is the one place a user picks their own role, and it is only
 * legitimate for a profile that has none yet. The page already redirects
 * role-holders, but the action is callable directly: an invited student
 * (is_student set by the teacher's invite) could otherwise post
 * `role: 'teacher'` and gain staff-wide profile reads.
 */
/** Only names the auth metadata actually carries — never blanks an existing profile name. */
const namesFromMetadata = (
  metadata: Record<string, unknown> | undefined
): { first_name?: string; last_name?: string } => {
  const pick = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  const first = pick(metadata?.first_name);
  const last = pick(metadata?.last_name);
  return { ...(first ? { first_name: first } : {}), ...(last ? { last_name: last } : {}) };
};

const hasAnyRole = (p: RoleFlags): boolean => Boolean(p.is_student || p.is_teacher || p.is_admin);

/**
 * An invited student already holds the student role but has not answered the
 * journey step. They may save it — as a student, once — without the role flags
 * being written at all.
 */
const isJourneyOnlySave = (p: RoleFlags, role: OnboardingSavePayload['role']): boolean =>
  Boolean(p.is_student && !p.is_teacher && !p.is_admin && !p.onboarding_completed) &&
  role === 'student';

/**
 * Persists the onboarding wizard's answers. Returns a result rather than
 * redirecting, so the wizard can show its "Done" step before navigating.
 */
export async function saveOnboarding(
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

  const adminClient = createAdminClient();
  const isTeacher = payload.role === 'teacher';
  // Invited students have no name metadata — writing '' would blank the name the teacher
  // (or the Cal.com booking) already put on the profile.
  const nameUpdate = namesFromMetadata(user.user_metadata);

  try {
    // Resolve the caller's PROFILE id once — profiles.id is an independent PK
    // (≠ auth.uid()); every write below is in profile-id space. Filtering
    // `profiles.id` by `user.id` silently matched nothing wherever the two
    // diverge (the class of bug 20260727140000 swept out of the writers).
    const { data: profile, error: profileLookupError } = await adminClient
      .from('profiles')
      .select('id, is_student, is_teacher, is_admin, onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileLookupError) {
      logger.error('[onboarding] profile lookup failed', profileLookupError);
      return { error: 'Failed to update profile' };
    }

    const journeyOnly = Boolean(profile && isJourneyOnlySave(profile, payload.role));
    if (profile && hasAnyRole(profile) && !journeyOnly) {
      logger.warn('[onboarding] rejected role change for a profile that already has a role', {
        userId: user.id,
        requestedRole: payload.role,
      });
      return { error: 'Onboarding is already complete for this account' };
    }

    // An authenticated user with no profile row cannot do anything at all: the
    // app redirects every route back here, and this action was the one place
    // that could have fixed it — it returned "Failed to update profile"
    // instead, which is an unescapable dead end. Production had five such
    // users on 2026-08-17 (the whole demo cohort: their auth rows were created
    // by a seed run that died before it wrote profiles), so clicking "Try Demo
    // Account" led a visitor into a five-minute wizard that could never be
    // completed. `trigger_handle_new_user` covers normal sign-up; this covers
    // every way a row can still go missing afterwards.
    const profileId = profile?.id ?? (await createMissingProfile(adminClient, user));
    if (!profileId) return { error: 'Failed to update profile' };

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        ...nameUpdate,
        // A journey-only save never touches the role flags.
        ...(journeyOnly ? {} : { is_student: !isTeacher, is_teacher: isTeacher }),
        // skill_level is single-sourced on profiles, not user_preferences.
        ...(!isTeacher && payload.student ? { skill_level: payload.student.skillLevel } : {}),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);
    if (profileError) {
      logger.error('[onboarding] profile update failed', profileError);
      return { error: 'Failed to update profile' };
    }

    if (isTeacher && payload.teacher) {
      await saveTeacherSettings(profileId, payload.teacher);
      await saveTeacherInstruments(profileId, payload.teacher.guitars);
    }
    if (!isTeacher && payload.student) await saveStudentPreferences(profileId, payload.student);
  } catch (error) {
    logger.error('[onboarding] unexpected error', error);
    return { error: 'An unexpected error occurred' };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
