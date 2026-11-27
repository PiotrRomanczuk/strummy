import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

type Named = { teacherId: string | null; teacherName: string | null };

/**
 * Names of the child's teachers, as the signed-in parent. RLS gives a parent the
 * child's lessons but not the teachers' profiles, so the lesson's teacher comes
 * back empty. `child_teacher_names` (SECURITY DEFINER) returns only id and
 * full_name, only for teachers of the caller's own child — no service role here.
 */
async function getChildTeacherNames(childId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('child_teacher_names', { p_child_id: childId });
  if (error) {
    logger.warn('[parent-dashboard] teacher names error', { error: error.message });
    return new Map();
  }
  return new Map(
    (data ?? []).map((row: { id: string; full_name: string }) => [row.id, row.full_name])
  );
}

/** Upcoming lessons and the latest note, with the teacher's name the parent could not read. */
export async function withChildTeacherNames<L extends Named, N extends Named>(
  childId: string,
  lessons: L[],
  note: N | null
): Promise<{ lessons: L[]; note: N | null }> {
  const isNameMissing = [...lessons, ...(note ? [note] : [])].some(
    (row) => row.teacherId && !row.teacherName
  );
  if (!isNameMissing) return { lessons, note };

  const names = await getChildTeacherNames(childId);
  const fill = <T extends Named>(row: T): T => ({
    ...row,
    teacherName: row.teacherName ?? (row.teacherId ? (names.get(row.teacherId) ?? null) : null),
  });
  return { lessons: lessons.map(fill), note: note ? fill(note) : null };
}
