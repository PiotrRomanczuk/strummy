/**
 * RLS-real coverage for the theory courses (#1216): `theoretical_courses`, `theoretical_lessons`,
 * `theoretical_course_access`.
 *
 * Policies (baseline, `20260727130000_legacy_policies_profile_space.sql`,
 * `20260813163000_fix_theoretical_course_access_rls_recursion.sql`):
 *   - a teacher creates courses; every teacher reads every live course, only the author (or an
 *     admin) edits or deletes it and its lessons;
 *   - a student reads a course and its lessons only when published AND granted to them;
 *   - an access row is visible to its student, the course author and admins.
 *
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('theory courses RLS', () => {
  let fx: TwoTeacherFixture;
  let courseId: string;
  let draftId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const course = await fx.teacherA.client
      .from('theoretical_courses')
      .insert({ title: 'RLS theory course', created_by: fx.teacherA.id, is_published: true })
      .select('id')
      .single();
    const draft = await fx.teacherA.client
      .from('theoretical_courses')
      .insert({ title: 'RLS theory draft', created_by: fx.teacherA.id })
      .select('id')
      .single();
    if (course.error || draft.error) {
      throw new Error(`seed course failed: ${course.error?.message ?? draft.error?.message}`);
    }
    courseId = course.data.id;
    draftId = draft.data.id;
    const lesson = await fx.teacherA.client
      .from('theoretical_lessons')
      .insert({ course_id: courseId, title: 'RLS theory lesson', is_published: true })
      .select('id')
      .single();
    if (lesson.error) throw new Error(`seed lesson failed: ${lesson.error.message}`);
  }, 60_000);

  afterAll(async () => {
    // Lessons and access rows cascade from the course; courses cascade from their author, but
    // delete every course a fixture teacher wrote explicitly, so nothing rides on the cascade.
    if (fx) {
      const { error } = await fx.service
        .from('theoretical_courses')
        .delete()
        .in('created_by', [fx.teacherA.id, fx.teacherB.id]);
      if (error) throw new Error(`theory cleanup failed: ${error.message}`);
    }
    await fx?.cleanup();
  });

  it('the author grants a student access, and that student reads the course and its lessons', async () => {
    const { error } = await fx.teacherA.client
      .from('theoretical_course_access')
      .insert({ course_id: courseId, profile_id: fx.studentA1.id, granted_by: fx.teacherA.id });
    expect(error).toBeNull();

    const course = await fx.studentA1.client.from('theoretical_courses').select('id');
    expect(course.data).toEqual([{ id: courseId }]);
    const lessons = await fx.studentA1.client
      .from('theoretical_lessons')
      .select('id')
      .eq('course_id', courseId);
    expect(lessons.data).toHaveLength(1);
    const access = await fx.studentA1.client.from('theoretical_course_access').select('course_id');
    expect(access.data).toEqual([{ course_id: courseId }]);
  });

  it('a student without access sees no course, lesson or access row', async () => {
    const course = await fx.studentB1.client.from('theoretical_courses').select('id');
    expect(course.data).toEqual([]);
    const lessons = await fx.studentB1.client
      .from('theoretical_lessons')
      .select('id')
      .eq('course_id', courseId);
    expect(lessons.data).toEqual([]);
    const access = await fx.studentB1.client
      .from('theoretical_course_access')
      .select('id')
      .eq('course_id', courseId);
    expect(access.data).toEqual([]);
  });

  it('a student with access still does not see an unpublished course', async () => {
    const { data } = await fx.studentA1.client
      .from('theoretical_courses')
      .select('id')
      .eq('id', draftId);
    expect(data).toEqual([]);
  });

  it('another teacher sees the course but not its access list, and cannot edit or delete it', async () => {
    const read = await fx.teacherB.client
      .from('theoretical_courses')
      .select('id')
      .eq('id', courseId);
    expect(read.data).toHaveLength(1);
    const access = await fx.teacherB.client
      .from('theoretical_course_access')
      .select('id')
      .eq('course_id', courseId);
    expect(access.data).toEqual([]);

    const update = await fx.teacherB.client
      .from('theoretical_courses')
      .update({ title: 'taken over' })
      .eq('id', courseId)
      .select('id');
    expect(update.data).toEqual([]);
    const lessonUpdate = await fx.teacherB.client
      .from('theoretical_lessons')
      .update({ title: 'taken over' })
      .eq('course_id', courseId)
      .select('id');
    expect(lessonUpdate.data).toEqual([]);
    const remove = await fx.teacherB.client
      .from('theoretical_courses')
      .delete()
      .eq('id', courseId)
      .select('id');
    expect(remove.data).toEqual([]);
  });

  it('a student cannot create a course or grant themselves access', async () => {
    const course = await fx.studentB1.client
      .from('theoretical_courses')
      .insert({ title: 'RLS student course', created_by: fx.studentB1.id });
    expect(course.error).not.toBeNull();
    const access = await fx.studentB1.client
      .from('theoretical_course_access')
      .insert({ course_id: courseId, profile_id: fx.studentB1.id, granted_by: fx.studentB1.id });
    expect(access.error).not.toBeNull();
  });

  // Known gaps, kept visible rather than fixed here (#1216): some write paths on these tables check
  // only the caller's role, not their relation to the course. Details are with the owner. When the
  // policies are tightened these tests start passing, and `it.failing` turns them red: drop it then.
  it.failing('another teacher cannot grant access to a course they did not author', async () => {
    const { error } = await fx.teacherB.client
      .from('theoretical_course_access')
      .insert({ course_id: courseId, profile_id: fx.studentB1.id, granted_by: fx.teacherB.id });
    expect(error).not.toBeNull();
  });

  it.failing('another teacher cannot add a lesson to a course they did not author', async () => {
    const { error } = await fx.teacherB.client
      .from('theoretical_lessons')
      .insert({ course_id: courseId, title: 'RLS foreign lesson', sort_order: 99 });
    expect(error).not.toBeNull();
  });
});
