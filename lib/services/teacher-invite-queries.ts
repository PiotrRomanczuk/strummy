import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/** A booked student (shadow profile, e.g. from Cal.com) who has had a lesson but no account yet. */
export type StudentToInvite = {
  studentId: string;
  name: string | null;
  email: string;
  firstLessonAt: string;
};

type LessonWithProfile = {
  student_id: string;
  scheduled_at: string;
  profiles:
    | { full_name: string | null; is_shadow: boolean | null; invite_email: string | null }
    | { full_name: string | null; is_shadow: boolean | null; invite_email: string | null }[]
    | null;
};

/**
 * Invite after the first lesson (owner decision 2026-10-16): the invite arrives from someone the
 * student has met, together with the lesson notes, and no-shows never get an account. A student
 * drops off this list the moment the invite is sent — sending it claims the shadow profile.
 */
export function pickStudentsToInvite(rows: LessonWithProfile[]): StudentToInvite[] {
  const byStudent = new Map<string, StudentToInvite>();
  for (const row of rows) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.is_shadow || !profile.invite_email) continue;
    const seen = byStudent.get(row.student_id);
    if (seen && seen.firstLessonAt <= row.scheduled_at) continue;
    byStudent.set(row.student_id, {
      studentId: row.student_id,
      name: profile.full_name,
      email: profile.invite_email,
      firstLessonAt: row.scheduled_at,
    });
  }
  return [...byStudent.values()].sort((a, b) => b.firstLessonAt.localeCompare(a.firstLessonAt));
}

export async function getStudentsToInvite(teacherId: string, now: Date): Promise<StudentToInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('student_id, scheduled_at, profiles:student_id(full_name, is_shadow, invite_email)')
    .eq('teacher_id', teacherId)
    .is('deleted_at', null)
    .neq('status', 'CANCELLED')
    .lt('scheduled_at', now.toISOString());

  if (error) {
    logger.warn('[teacher-dashboard] students-to-invite error', { error: error.message });
    return [];
  }
  return pickStudentsToInvite((data ?? []) as LessonWithProfile[]);
}
