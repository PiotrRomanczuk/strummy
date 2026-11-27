/**
 * RLS-real coverage for the chord quiz and skills tables (#1216):
 * `chord_quiz_attempts`, `chord_srs`, `student_skills`, `skills`.
 *
 * Policies (baseline, rewritten in `20260727130000_legacy_policies_profile_space.sql`):
 *   - quiz attempts and SRS state: a student writes and reads only their own rows; staff read all;
 *   - `student_skills`: staff manage, a student reads only their own;
 *   - `skills`: a shared catalogue everyone reads, only staff write — it has no owner, so there is
 *     no "someone else's row" to hide; the suite pins who may write instead.
 *
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { describeIfRls, rlsRunId, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('quiz and skills RLS', () => {
  let fx: TwoTeacherFixture;
  const skillIds: string[] = [];
  const skillName = (label: string) => `RLS skill ${label} ${rlsRunId()}-${Date.now()}`;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const { data, error } = await fx.service
      .from('skills')
      .insert({ name: skillName('seed'), category: 'technique' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`seed skills failed: ${error?.message}`);
    skillIds.push(data.id);
  }, 60_000);

  afterAll(async () => {
    // Quiz, SRS and student_skills rows cascade from the fixture profiles; skills have no owner.
    if (skillIds.length > 0) {
      const { error } = await fx.service.from('skills').delete().in('id', skillIds);
      if (error) throw new Error(`skills cleanup failed: ${error.message}`);
    }
    await fx?.cleanup();
  });

  describe('chord_quiz_attempts', () => {
    const attempt = (studentId: string) => ({
      student_id: studentId,
      chord_id: 'C',
      selected_answer: 'C',
      is_correct: true,
    });

    it('a student records and reads their own attempt', async () => {
      const { error } = await fx.studentA1.client
        .from('chord_quiz_attempts')
        .insert(attempt(fx.studentA1.id));
      expect(error).toBeNull();
      const { data } = await fx.studentA1.client.from('chord_quiz_attempts').select('student_id');
      expect(data).toEqual([{ student_id: fx.studentA1.id }]);
    });

    it("another student does not see it and cannot write one in the first student's name", async () => {
      const { data } = await fx.studentB1.client
        .from('chord_quiz_attempts')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(data).toEqual([]);
      const { error } = await fx.studentB1.client
        .from('chord_quiz_attempts')
        .insert(attempt(fx.studentA1.id));
      expect(error).not.toBeNull();
    });

    it("the student's teacher reads it", async () => {
      const { data } = await fx.teacherA.client
        .from('chord_quiz_attempts')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(data).toHaveLength(1);
    });
  });

  describe('chord_srs', () => {
    it('a student keeps their own review state', async () => {
      const own = await fx.studentA1.client
        .from('chord_srs')
        .insert({ student_id: fx.studentA1.id, chord_id: 'G' })
        .select('id')
        .single();
      expect(own.error).toBeNull();
      const { data } = await fx.studentA1.client
        .from('chord_srs')
        .update({ repetitions: 2 })
        .eq('id', own.data!.id)
        .select('repetitions');
      expect(data).toEqual([{ repetitions: 2 }]);
    });

    it("another student neither sees nor changes it, nor writes in the first student's name", async () => {
      const read = await fx.studentB1.client
        .from('chord_srs')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(read.data).toEqual([]);
      const update = await fx.studentB1.client
        .from('chord_srs')
        .update({ repetitions: 9 })
        .eq('student_id', fx.studentA1.id)
        .select('id');
      expect(update.data).toEqual([]);
      const insert = await fx.studentB1.client
        .from('chord_srs')
        .insert({ student_id: fx.studentA1.id, chord_id: 'Am' });
      expect(insert.error).not.toBeNull();
    });
  });

  describe('skills and student_skills', () => {
    it('everyone signed in reads the catalogue; a student cannot add to it', async () => {
      const { data } = await fx.studentA1.client.from('skills').select('id').eq('id', skillIds[0]);
      expect(data).toHaveLength(1);
      const { error } = await fx.studentA1.client
        .from('skills')
        .insert({ name: skillName('student'), category: 'technique' });
      expect(error).not.toBeNull();
    });

    it('a teacher adds a skill to the catalogue', async () => {
      const { data, error } = await fx.teacherA.client
        .from('skills')
        .insert({ name: skillName('teacher'), category: 'technique' })
        .select('id')
        .single();
      expect(error).toBeNull();
      skillIds.push(data!.id);
    });

    it('a teacher assesses a student; only that student sees the assessment', async () => {
      const { error } = await fx.teacherA.client
        .from('student_skills')
        .insert({ student_id: fx.studentA1.id, skill_id: skillIds[0], status: 'developing' });
      expect(error).toBeNull();

      const own = await fx.studentA1.client.from('student_skills').select('student_id');
      expect(own.data).toEqual([{ student_id: fx.studentA1.id }]);
      const other = await fx.studentB1.client
        .from('student_skills')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(other.data).toEqual([]);
    });

    it('a student cannot assess themselves', async () => {
      const insert = await fx.studentB1.client
        .from('student_skills')
        .insert({ student_id: fx.studentB1.id, skill_id: skillIds[0], status: 'mastered' });
      expect(insert.error).not.toBeNull();
      const update = await fx.studentA1.client
        .from('student_skills')
        .update({ status: 'mastered' })
        .eq('student_id', fx.studentA1.id)
        .select('id');
      expect(update.data).toEqual([]);
    });
  });
});
