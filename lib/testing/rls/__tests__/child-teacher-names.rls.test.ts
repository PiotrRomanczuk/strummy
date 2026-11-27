/**
 * RLS acceptance tests for child_teacher_names (#1092, migration
 * 20261127120000).
 *
 * A parent cannot read the profile of their child's teacher (no SELECT policy
 * on profiles covers it, on purpose — see #1096). The function hands them the
 * teacher's id and full_name only, and only for their own child's teachers.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls('child_teacher_names', () => {
  let fx: TwoTeacherFixture;
  let parent: SeededUser;
  let teacherAName: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    parent = await createSignedInRlsUser(fx.service, 'student', 'teacher-names-parent');
    const linked = await Promise.all([
      fx.service.from('profiles').update({ is_parent: true }).eq('id', parent.id),
      fx.service.from('profiles').update({ parent_id: parent.id }).eq('id', fx.studentA1.id),
    ]);
    const failed = linked.find((result) => result.error);
    if (failed?.error) throw new Error(`link parent failed: ${failed.error.message}`);

    const { data, error } = await fx.service
      .from('profiles')
      .select('full_name')
      .eq('id', fx.teacherA.id)
      .single();
    if (error || !data?.full_name) throw new Error('teacher A has no name');
    teacherAName = data.full_name;
  }, 30_000);

  afterAll(async () => {
    // The parent link goes first so deleting the parent does not trip on the child.
    await fx?.service.from('profiles').update({ parent_id: null }).eq('id', fx.studentA1.id);
    await fx?.cleanup();
  });

  it("returns the name of the child's teacher, and nothing else", async () => {
    const { data, error } = await parent.client.rpc('child_teacher_names', {
      p_child_id: fx.studentA1.id,
    });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: fx.teacherA.id, full_name: teacherAName }]);
  });

  it("returns no names for another family's child", async () => {
    const { data, error } = await parent.client.rpc('child_teacher_names', {
      p_child_id: fx.studentB1.id,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('returns nothing to a teacher or student who is not the parent', async () => {
    for (const client of [fx.teacherB.client, fx.studentB1.client]) {
      const { data, error } = await client.rpc('child_teacher_names', {
        p_child_id: fx.studentA1.id,
      });
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("still gives the parent no row of the teacher's profile", async () => {
    const { data } = await parent.client
      .from('profiles')
      .select('id, email, notes')
      .in('id', [fx.teacherA.id, fx.teacherB.id]);
    expect(data).toEqual([]);
  });
});
