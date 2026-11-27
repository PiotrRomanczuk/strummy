/**
 * RLS acceptance tests for teacher_update_student (#1178, migration
 * 20261127130000): a teacher edits and archives the students they teach, and
 * nothing else — no other teacher's student, no staff profile, no role flag.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('teacher_update_student RLS', () => {
  let fx: TwoTeacherFixture;

  const profile = async (id: string) =>
    (
      await fx.service
        .from('profiles')
        .select('full_name, skill_level, student_status, is_admin, is_teacher')
        .eq('id', id)
        .single()
    ).data;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
  }, 30_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  it('the teacher edits and archives their own student', async () => {
    const { error } = await fx.teacherA.client.rpc('teacher_update_student', {
      p_student_id: fx.studentA1.id,
      p_changes: { full_name: 'RLS Renamed', skill_level: 'advanced', student_status: 'archived' },
    });
    expect(error).toBeNull();
    expect(await profile(fx.studentA1.id)).toMatchObject({
      full_name: 'RLS Renamed',
      skill_level: 'advanced',
      student_status: 'archived',
    });
  });

  it("refuses another teacher's student and leaves the row as it was", async () => {
    const before = await profile(fx.studentB1.id);
    const { error } = await fx.teacherA.client.rpc('teacher_update_student', {
      p_student_id: fx.studentB1.id,
      p_changes: { full_name: 'Hijacked' },
    });
    expect(error?.code).toBe('42501');
    expect(await profile(fx.studentB1.id)).toEqual(before);
  });

  it.each([{ is_admin: true }, { is_teacher: true }, { is_active: false }, { email: 'x@y.z' }])(
    'refuses a role or account field %p, even on their own student',
    async (changes) => {
      const { error } = await fx.teacherA.client.rpc('teacher_update_student', {
        p_student_id: fx.studentA1.id,
        p_changes: { full_name: 'Sneaky', ...changes },
      });
      expect(error?.code).toBe('42501');
      expect(await profile(fx.studentA1.id)).toMatchObject({
        full_name: 'RLS Renamed',
        is_admin: false,
        is_teacher: false,
      });
    }
  );

  it('refuses a staff profile', async () => {
    const { error } = await fx.teacherA.client.rpc('teacher_update_student', {
      p_student_id: fx.teacherB.id,
      p_changes: { full_name: 'Renamed teacher' },
    });
    expect(error?.code).toBe('42501');
  });

  it('a student cannot use it, not even on themselves', async () => {
    const { error } = await fx.studentA1.client.rpc('teacher_update_student', {
      p_student_id: fx.studentA1.id,
      p_changes: { student_status: 'active' },
    });
    expect(error?.code).toBe('42501');
    expect(await profile(fx.studentA1.id)).toMatchObject({ student_status: 'archived' });
  });

  it('a direct UPDATE by the teacher still changes nothing', async () => {
    await fx.teacherA.client
      .from('profiles')
      .update({ full_name: 'Direct write' })
      .eq('id', fx.studentA1.id);
    expect(await profile(fx.studentA1.id)).toMatchObject({ full_name: 'RLS Renamed' });
  });
});
