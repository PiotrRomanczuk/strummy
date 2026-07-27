import type { SupabaseClient } from '@supabase/supabase-js';
import type { TwoTeacherFixture } from './seedTwoTeachers';

/**
 * Extra rows seeded on top of {@link seedTwoTeachers} so the core-table RLS
 * suite can assert teacher-isolation + student-own-only across
 * `assignments`, `practice_sessions`, and `student_repertoire`.
 *
 * Teacher A owns student A1; teacher B owns student B1. One row per
 * (teacher, student) pair so cross-tenant leakage is observable.
 *
 * ## Identity-space audit (2026-07-27, vs supabase/baseline/cloud_schema_2026-06-22.sql)
 * Every identity column below is PROFILE-id space — always pass `fx.<user>.id`,
 * never `fx.<user>.userId`:
 *   - assignments.teacher_id / student_id      → profiles(id)
 *   - practice_sessions.student_id             → profiles(id)
 *   - student_repertoire.student_id / assigned_by → profiles(id)
 *
 * NOTE: the LIVE baseline policies on `practice_sessions`
 * (`student_id = auth.uid()`) and `student_repertoire` (`sr_select_own` /
 * `sr_update_own_notes`, also `auth.uid()`) still compare these profile-id
 * columns to the auth uid — fail-closed for any user whose profiles.id differs
 * from their auth uid. Those policies are being repointed to
 * `current_profile_id()` by a later migration in this effort; the RLS suites
 * target that end state.
 */
export type CoreTableRows = {
  songId: string;
  assignmentA: string;
  assignmentB: string;
  practiceA1: string;
  practiceB1: string;
  repertoireA1: string;
  repertoireB1: string;
};

async function insertReturningId(
  service: SupabaseClient,
  table: string,
  row: Record<string, unknown>
): Promise<string> {
  const { data, error } = await service.from(table).insert(row).select('id').single();
  if (error || !data) {
    throw new Error(`seed ${table} failed: ${error?.message ?? 'no row returned'}`);
  }
  return (data as { id: string }).id;
}

/**
 * Seed one song plus one assignment, practice session, and repertoire row for
 * each (teacher, student) pair. Uses the service client (bypasses RLS) so the
 * rows exist regardless of policy. Caller must already hold a
 * {@link TwoTeacherFixture}; cleanup cascades via the fixture's auth-user
 * deletion (FKs are ON DELETE CASCADE).
 */
export async function seedCoreTables(fx: TwoTeacherFixture): Promise<CoreTableRows> {
  const { service, teacherA, teacherB, studentA1, studentB1 } = fx;

  const songId = await insertReturningId(service, 'songs', {
    title: 'RLS fixture song',
  });

  const [assignmentA, assignmentB] = await Promise.all([
    insertReturningId(service, 'assignments', {
      title: 'RLS assignment A',
      teacher_id: teacherA.id,
      student_id: studentA1.id,
    }),
    insertReturningId(service, 'assignments', {
      title: 'RLS assignment B',
      teacher_id: teacherB.id,
      student_id: studentB1.id,
    }),
  ]);

  const [practiceA1, practiceB1] = await Promise.all([
    insertReturningId(service, 'practice_sessions', {
      student_id: studentA1.id,
      song_id: songId,
      duration_minutes: 30,
    }),
    insertReturningId(service, 'practice_sessions', {
      student_id: studentB1.id,
      song_id: songId,
      duration_minutes: 45,
    }),
  ]);

  // UPSERT, not insert: fn_aggregate_practice_to_repertoire (20260727134000)
  // auto-creates the (student, song) repertoire row when the practice
  // sessions above are inserted, so a plain insert now dies on
  // uq_student_repertoire.
  const upsertRepertoire = async (student_id: string, assigned_by: string): Promise<string> => {
    const { data, error } = await service
      .from('student_repertoire')
      .upsert({ student_id, song_id: songId, assigned_by }, { onConflict: 'student_id,song_id' })
      .select('id')
      .single();
    if (error || !data) {
      throw new Error(`upsert student_repertoire failed: ${error?.message ?? 'no row returned'}`);
    }
    return (data as { id: string }).id;
  };
  const [repertoireA1, repertoireB1] = await Promise.all([
    upsertRepertoire(studentA1.id, teacherA.id),
    upsertRepertoire(studentB1.id, teacherB.id),
  ]);

  return {
    songId,
    assignmentA,
    assignmentB,
    practiceA1,
    practiceB1,
    repertoireA1,
    repertoireB1,
  };
}
