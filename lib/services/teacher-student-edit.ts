import { createClient } from '@/lib/supabase/server';
import { toProfileColumns, type StudentIntakeFields } from '@/schemas/StudentIntakeSchema';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type EditScope = {
  /** The caller's PROFILE id (lessons.teacher_id space), not the auth id. */
  profileId: string;
  isAdmin: boolean;
  isTeacher: boolean;
};

/**
 * Whether the caller may open the edit form for this profile (#1178).
 * Admin: anyone. Teacher: a student they teach (a non-deleted lesson together,
 * the `teacher_students` view) who is a student and nothing else.
 *
 * A UI / pre-write gate only — `teacher_update_student` enforces the same rule
 * in the database (ADR-0001).
 */
export async function canEditStudent(scope: EditScope, studentId: string): Promise<boolean> {
  if (scope.isAdmin) return true;
  if (!scope.isTeacher) return false;
  const supabase = await createClient();
  const [{ data: link }, { data: target }] = await Promise.all([
    supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', scope.profileId)
      .eq('student_id', studentId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('is_student, is_admin, is_teacher')
      .eq('id', studentId)
      .maybeSingle(),
  ]);
  if (!link || !target) return false;
  return Boolean(target.is_student) && !target.is_admin && !target.is_teacher;
}

/** Body keys only an admin may send: role flags, account state, parent link. */
export const ADMIN_ONLY_KEYS = [
  'isAdmin',
  'isTeacher',
  'isStudent',
  'isParent',
  'isActive',
  'parentId',
  'firstName',
  'lastName',
] as const;

export type TeacherStudentChanges = StudentIntakeFields & {
  full_name?: string;
  phone?: string;
  goals?: string;
  studentStatus?: 'active' | 'archived';
};

/** Maps a validated PUT body to the snake_case columns the RPC accepts. */
export function toTeacherChanges(body: TeacherStudentChanges): Record<string, string | number> {
  const changes: Record<string, string | number> = { ...toProfileColumns(body) };
  if (body.full_name !== undefined) changes.full_name = body.full_name;
  if (body.phone !== undefined) changes.phone = body.phone;
  if (body.studentStatus !== undefined) changes.student_status = body.studentStatus;
  return changes;
}

/**
 * Teacher write path: one SECURITY DEFINER call that checks "my student" and
 * the editable columns itself. Returns the Postgres error message, or null.
 */
export async function updateOwnStudent(
  supabase: Supabase,
  studentId: string,
  body: TeacherStudentChanges
): Promise<{ error: string | null; isForbidden: boolean }> {
  const { error } = await supabase.rpc('teacher_update_student', {
    p_student_id: studentId,
    p_changes: toTeacherChanges(body),
  });
  if (!error) return { error: null, isForbidden: false };
  return { error: error.message, isForbidden: error.code === '42501' };
}
