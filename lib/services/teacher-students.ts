import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the IDs of all students who have at least one lesson with the given teacher.
 * Uses the `teacher_students` view derived from the lessons table.
 */
export async function getTeacherStudentIds(
  supabase: SupabaseClient,
  teacherId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('teacher_students')
    .select('student_id')
    .eq('teacher_id', teacherId);
  return (data ?? []).map((r: { student_id: string }) => r.student_id);
}
