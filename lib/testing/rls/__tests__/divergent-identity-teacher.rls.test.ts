/**
 * REGRESSION LOCK — divergent identity, TEACHER side.
 *
 * `divergent-identity.rls.test.ts` proves the student read/write paths survive
 * `profiles.id ≠ auth uid`. This suite covers the other actor: a teacher whose
 * ids diverge must still see and own their lessons, assignments and roster.
 *
 * Why it matters beyond policy correctness: `lessons.teacher_id` and
 * `assignments.teacher_id` are in PROFILE-id space, and the `teacher_students`
 * view derives the roster from `lessons`. A teacher created after migration
 * 20260727110000 ("S2") gets `profiles.id = gen_random_uuid()`, so any policy
 * — or application query — that compares those columns to an auth uid returns
 * an EMPTY STUDIO for them while looking perfectly correct for every account
 * seeded before S2. That is invisible to fixtures that force the ids equal.
 *
 * The application-query half of the same bug is ratcheted statically in
 * `__tests__/architecture/profile-id-space.test.ts`.
 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  describeIfRls,
  createServiceClient,
  createSignedInRlsUser,
  signInAs,
  RLS_TEST_PASSWORD,
  type SeededUser,
} from '../index';

describeIfRls('divergent identity RLS lock — teacher with profiles.id ≠ auth uid', () => {
  const service = createServiceClient();
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let student: SeededUser;
  let teacherAuthUid = '';
  let teacherProfileId = '';
  let teacherClient: SupabaseClient;
  let lessonId = '';
  let assignmentId = '';

  beforeAll(async () => {
    student = await createSignedInRlsUser(service, 'student', `divt-${tag}`);

    // Create the auth user, then FORCE divergence: drop the row
    // handle_new_user made (legacy stacks set id = auth uid) and insert one
    // with an unrelated PK, which is what a post-S2 signup produces.
    const email = `rls-teacher-divt-${tag}@guitarcrm.local`;
    const created = await service.auth.admin.createUser({
      email,
      password: RLS_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { isTest: true },
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser(${email}) failed: ${created.error?.message ?? 'no user'}`);
    }
    teacherAuthUid = created.data.user.id;

    const del = await service.from('profiles').delete().eq('user_id', teacherAuthUid);
    if (del.error) throw new Error(`delete trigger profile failed: ${del.error.message}`);

    teacherProfileId = randomUUID();
    const ins = await service.from('profiles').insert({
      id: teacherProfileId,
      user_id: teacherAuthUid,
      email,
      full_name: `RLS divergent teacher ${tag}`,
      is_teacher: true,
      is_development: true,
    });
    if (ins.error) throw new Error(`insert divergent profile failed: ${ins.error.message}`);

    teacherClient = await signInAs(email, RLS_TEST_PASSWORD);
  }, 30_000);

  afterAll(async () => {
    const authUids = [teacherAuthUid, student?.userId].filter(Boolean) as string[];
    await Promise.allSettled(authUids.map((uid) => service.auth.admin.deleteUser(uid)));
  });

  it('sanity: the profile id and the auth uid actually diverge', () => {
    expect(teacherProfileId).not.toBe(teacherAuthUid);
    expect(teacherProfileId).toHaveLength(36);
  });

  it('the teacher can CREATE a lesson owned by their profile id', async () => {
    const { data, error } = await teacherClient
      .from('lessons')
      .insert({
        teacher_id: teacherProfileId,
        student_id: student.id,
        title: `Divergent identity lesson ${tag}`,
        scheduled_at: new Date('2026-09-01T10:00:00Z').toISOString(),
        status: 'SCHEDULED',
      })
      .select('id, teacher_id')
      .single();

    expect(error).toBeNull();
    expect(data?.teacher_id).toBe(teacherProfileId);
    expect(data?.teacher_id).not.toBe(teacherAuthUid);
    lessonId = (data as { id: string }).id;
  });

  it('the teacher SEES that lesson back (select policy in profile-id space)', async () => {
    const { data, error } = await teacherClient
      .from('lessons')
      .select('id, teacher_id')
      .eq('id', lessonId)
      .maybeSingle();

    expect(error).toBeNull();
    // Empty here is the exact production symptom: a brand-new teacher signs in
    // to a studio that looks like it has no lessons at all.
    expect(data?.id).toBe(lessonId);
  });

  it('the teacher can CREATE and SEE an assignment for that student', async () => {
    const insert = await teacherClient
      .from('assignments')
      .insert({
        teacher_id: teacherProfileId,
        student_id: student.id,
        title: `Divergent identity assignment ${tag}`,
        status: 'not_started',
      })
      .select('id')
      .single();
    expect(insert.error).toBeNull();
    assignmentId = (insert.data as { id: string }).id;

    const read = await teacherClient
      .from('assignments')
      .select('id, teacher_id')
      .eq('id', assignmentId)
      .maybeSingle();
    expect(read.error).toBeNull();
    expect(read.data?.teacher_id).toBe(teacherProfileId);
  });

  it('the student appears in the teacher_students roster view', async () => {
    // The view derives the roster from `lessons`, so a teacher_id compared in
    // the wrong id space yields a teacher with zero students despite having
    // scheduled lessons.
    const { data, error } = await teacherClient
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherProfileId);

    expect(error).toBeNull();
    expect(data?.map((r) => r.student_id)).toContain(student.id);
  });

  it('another teacher cannot see this teacher’s lesson', async () => {
    const other = await createSignedInRlsUser(service, 'teacher', `divt-other-${tag}`);
    try {
      const { data, error } = await other.client
        .from('lessons')
        .select('id')
        .eq('id', lessonId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    } finally {
      await service.auth.admin.deleteUser(other.userId);
    }
  }, 30_000);
});
