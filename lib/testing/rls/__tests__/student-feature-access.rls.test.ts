/**
 * RLS acceptance tests for `student_feature_access`
 * (migration 20261031100000). A teacher turns a feature on for a student; the
 * student can read that but never grant themselves anything.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

const FEATURE = 'song-harmony';

describeIfRls('student_feature_access RLS', () => {
  let fx: TwoTeacherFixture;
  let student: SeededUser;
  let otherStudent: SeededUser;

  const rowsFor = (studentId: string) =>
    fx.service.from('student_feature_access').select('feature_key').eq('student_id', studentId);

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    student = await createSignedInRlsUser(fx.service, 'student', 'feature-a');
    otherStudent = await createSignedInRlsUser(fx.service, 'student', 'feature-b');
  }, 30_000);

  afterAll(async () => {
    await fx?.service
      .from('student_feature_access')
      .delete()
      .in('student_id', [student.id, otherStudent.id]);
    await fx?.cleanup();
  });

  beforeEach(async () => {
    await fx.service.from('student_feature_access').delete().eq('student_id', student.id);
  });

  it('a teacher can turn a feature on and off', async () => {
    const { error: insertError } = await fx.teacherA.client
      .from('student_feature_access')
      .insert({ student_id: student.id, feature_key: FEATURE, enabled_by: fx.teacherA.id });
    expect(insertError).toBeNull();
    expect((await rowsFor(student.id)).data).toHaveLength(1);

    await fx.teacherA.client
      .from('student_feature_access')
      .delete()
      .eq('student_id', student.id)
      .eq('feature_key', FEATURE);
    expect((await rowsFor(student.id)).data).toHaveLength(0);
  });

  it('a student reads their own features', async () => {
    await fx.service
      .from('student_feature_access')
      .insert({ student_id: student.id, feature_key: FEATURE });

    const { data, error } = await student.client
      .from('student_feature_access')
      .select('feature_key');
    expect(error).toBeNull();
    expect(data).toEqual([{ feature_key: FEATURE }]);
  });

  it("a student CANNOT read another student's features", async () => {
    await fx.service
      .from('student_feature_access')
      .insert({ student_id: student.id, feature_key: FEATURE });

    const { data } = await otherStudent.client
      .from('student_feature_access')
      .select('feature_key')
      .eq('student_id', student.id);
    expect(data).toEqual([]);
  });

  it('a student CANNOT turn a feature on for themselves', async () => {
    const { error } = await student.client
      .from('student_feature_access')
      .insert({ student_id: student.id, feature_key: FEATURE });
    expect(error).not.toBeNull();
    expect((await rowsFor(student.id)).data).toHaveLength(0);
  });

  it('a student CANNOT remove a feature the teacher turned on', async () => {
    await fx.service
      .from('student_feature_access')
      .insert({ student_id: student.id, feature_key: FEATURE });

    await student.client.from('student_feature_access').delete().eq('student_id', student.id);
    expect((await rowsFor(student.id)).data).toHaveLength(1);
  });
});
