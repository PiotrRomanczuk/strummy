import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type StudentProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  createdAt: string | null;
  isShadow: boolean;
  inviteEmail: string | null;
  /**
   * Whether this student has ever signed in — distinct from `!isShadow`, which
   * only says an auth account exists. Sending an invite creates that account, so
   * an invited-but-unclaimed student reads as non-shadow while still needing a
   * (re)invite.
   */
  hasSignedIn: boolean;
};

export type StudentRepertoireRow = {
  id: string;
  songId: string;
  songTitle: string;
  songAuthor: string | null;
  status: string;
  totalPracticeMinutes: number;
  lastPracticedAt: string | null;
};

export type StudentRecentLesson = {
  id: string;
  scheduledAt: string;
  status: string;
  title: string | null;
};

export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at, is_shadow, invite_email')
    .eq('id', studentId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.warn('[student-detail-queries] profile error', {
        error: error.message,
        code: error.code,
      });
    }
    return null;
  }

  // auth.users is unreadable by the authenticated role; this helper is
  // SECURITY DEFINER and admin/teacher-gated. On failure we fall back to
  // "not signed in", which only ever offers a redundant resend.
  const { data: signedIn, error: signedInError } = await supabase.rpc('profiles_signed_in', {
    p_profile_ids: [studentId],
  });
  if (signedInError) {
    logger.warn('[student-detail-queries] signed-in lookup failed', {
      error: signedInError.message,
    });
  }

  return {
    id: data.id as string,
    fullName: (data.full_name as string) ?? null,
    email: (data.email as string) ?? null,
    createdAt: (data.created_at as string) ?? null,
    isShadow: (data.is_shadow as boolean) ?? false,
    inviteEmail: (data.invite_email as string) ?? null,
    hasSignedIn: (signedIn ?? []).length > 0,
  };
}

export async function getStudentRepertoire(
  studentId: string,
  limit?: number
): Promise<StudentRepertoireRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('student_repertoire')
    .select(
      'id, song_id, current_status, total_practice_minutes, last_practiced_at, songs:song_id(title, author)'
    )
    .eq('student_id', studentId)
    .order('last_practiced_at', { ascending: false, nullsFirst: false })
    // Tiebreaker: rows with no practice yet would otherwise come back in
    // arbitrary order, making the collapsed repertoire view non-deterministic.
    .order('created_at', { ascending: false });
  if (limit !== undefined) {
    query = query.limit(limit);
  }
  const { data, error } = await query;

  if (error) {
    logger.warn('[student-detail-queries] repertoire error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return {
      id: row.id as string,
      songId: row.song_id as string,
      songTitle: (song?.title as string) ?? 'Untitled',
      songAuthor: (song?.author as string) ?? null,
      status: row.current_status as string,
      totalPracticeMinutes: (row.total_practice_minutes as number) ?? 0,
      lastPracticedAt: (row.last_practiced_at as string) ?? null,
    };
  });
}

export async function getStudentRecentLessons(
  studentId: string,
  limit = 8
): Promise<StudentRecentLesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, scheduled_at, status, title')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('[student-detail-queries] lessons error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    scheduledAt: row.scheduled_at as string,
    status: row.status as string,
    title: (row.title as string) ?? null,
  }));
}

export const totalPracticeMinutes = (rows: StudentRepertoireRow[]): number =>
  rows.reduce((sum, r) => sum + r.totalPracticeMinutes, 0);

export type StudentPreferences = {
  skillLevel: string;
  goals: string[];
  learningStyle: string[];
  /** Instruments the student has, from onboarding. Empty when never asked. */
  guitars: string[];
};

/**
 * Preferences (ASG-4/IDA-4) for the "About this student" line on the
 * teacher's detail view. skill_level is single-sourced on profiles
 * (20260727120000); goals and learning style remain onboarding-owned in
 * user_preferences. Null when neither source has anything to show.
 */
export async function getStudentPreferences(studentId: string): Promise<StudentPreferences | null> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('skill_level')
    .eq('id', studentId)
    .maybeSingle();

  if (profileError) {
    logger.warn('[student-detail-queries] preferences error', {
      error: profileError.message,
      code: profileError.code,
    });
    return null;
  }

  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('goals, learning_style, instrument_preference')
    .eq('user_id', studentId)
    .maybeSingle();

  if (prefsError) {
    logger.warn('[student-detail-queries] preferences error', {
      error: prefsError.message,
      code: prefsError.code,
    });
    return null;
  }

  const skillLevel = (profile?.skill_level as string | null) ?? null;
  if (!prefs && !skillLevel) return null;

  return {
    skillLevel: skillLevel ?? '',
    goals: (prefs?.goals as string[]) ?? [],
    learningStyle: (prefs?.learning_style as string[]) ?? [],
    guitars: (prefs?.instrument_preference as string[]) ?? [],
  };
}
