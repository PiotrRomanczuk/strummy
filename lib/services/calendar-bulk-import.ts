import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { matchStudentByEmail, createShadowStudent } from '@/lib/services/import-utils';

type Attendee = { email: string; displayName?: string };

export interface MonthChunk {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Generate month-boundary chunks between two dates for paginated fetching.
 */
export function generateMonthChunks(startDate: Date, endDate: Date): MonthChunk[] {
  const chunks: MonthChunk[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current < endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
    const effectiveEnd = monthEnd > endDate ? endDate : monthEnd;

    chunks.push({
      start: monthStart,
      end: effectiveEnd,
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    });

    current.setMonth(current.getMonth() + 1);
  }

  return chunks;
}

/**
 * Determine lesson status based on whether the event is in the past or future.
 */
export function determineLessonStatus(eventStartTime: string): 'COMPLETED' | 'SCHEDULED' {
  return new Date(eventStartTime) < new Date() ? 'COMPLETED' : 'SCHEDULED';
}

/**
 * Extract student email from event attendees, excluding the teacher.
 */
export function extractStudentFromAttendees(
  attendees: Array<{ email: string; displayName?: string }> | undefined,
  teacherEmail: string
): { email: string; displayName: string } | null {
  if (!attendees || attendees.length === 0) return null;

  const student =
    attendees.find((a) => a.email.toLowerCase() !== teacherEmail.toLowerCase()) || attendees[0];

  if (!student?.email) return null;

  const cleanName = (name: string) => name.replace(/\$\$\$\s*/g, '').trim();

  return {
    email: student.email,
    displayName: student.displayName ? cleanName(student.displayName) : '',
  };
}

/**
 * Resolve the student attendee from a list, cross-referencing the DB to
 * prefer a known student over a parent account.
 *
 * Priority:
 *   1. Single non-teacher attendee → return as-is (current behaviour)
 *   2. Email matches is_student=true → prefer that profile
 *   3. Email matches is_parent=true → look up their child student
 *   4. Fall back to first non-teacher (original behaviour)
 */
export async function resolveStudentAttendee(
  attendees: Attendee[] | undefined,
  teacherEmail: string,
  supabase: SupabaseClient<Database>
): Promise<{ email: string; displayName: string } | null> {
  if (!attendees || attendees.length === 0) return null;

  const cleanName = (name: string) => name.replace(/\$\$\$\s*/g, '').trim();

  const nonTeacher = attendees.filter(
    (a) => a.email.toLowerCase() !== teacherEmail.toLowerCase()
  );

  if (nonTeacher.length === 0) return null;

  if (nonTeacher.length === 1) {
    return {
      email: nonTeacher[0].email,
      displayName: nonTeacher[0].displayName ? cleanName(nonTeacher[0].displayName) : '',
    };
  }

  // Multiple non-teacher attendees: cross-reference profiles
  const emails = nonTeacher.map((a) => a.email.toLowerCase());

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, is_student, is_parent')
    .in('email', emails);

  if (profiles && profiles.length > 0) {
    // Priority 1: known student
    const studentProfile = profiles.find((p) => p.is_student);
    if (studentProfile) {
      const matched = nonTeacher.find(
        (a) => a.email.toLowerCase() === studentProfile.email?.toLowerCase()
      );
      return {
        email: studentProfile.email!,
        displayName: matched?.displayName ? cleanName(matched.displayName) : '',
      };
    }

    // Priority 2: known parent → look up their child
    const parentProfile = profiles.find((p) => p.is_parent);
    if (parentProfile) {
      const { data: child } = await supabase
        .from('profiles')
        .select('email')
        .eq('parent_id', parentProfile.id)
        .eq('is_student', true)
        .single();
      if (child?.email) {
        return { email: child.email, displayName: '' };
      }
    }
  }

  // Fallback: first non-teacher
  return {
    email: nonTeacher[0].email,
    displayName: nonTeacher[0].displayName ? cleanName(nonTeacher[0].displayName) : '',
  };
}

/**
 * Find an existing student profile by email, or create a shadow student.
 * Uses the admin client to bypass RLS for bulk operations.
 */
export async function findOrCreateStudent(
  _adminClient: SupabaseClient<Database>,
  email: string,
  displayName: string
): Promise<{ profileId: string } | { error: string }> {
  const match = await matchStudentByEmail(email);

  if (match.status === 'MATCHED') {
    return { profileId: match.candidates[0].id };
  }

  if (match.status === 'AMBIGUOUS') {
    return { error: `Ambiguous match for ${email} (${match.candidates.length} candidates)` };
  }

  // No match - create shadow student
  const [firstName, ...lastParts] = (displayName || email.split('@')[0]).split(' ');
  const lastName = lastParts.join(' ') || '';

  const result = await createShadowStudent(email, firstName, lastName);

  if (!result.success || !result.profileId) {
    return { error: result.error || `Failed to create student for ${email}` };
  }

  return { profileId: result.profileId };
}
