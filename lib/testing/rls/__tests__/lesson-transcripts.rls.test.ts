/**
 * RLS acceptance tests for `lesson_transcripts` (CNT-5, migration
 * 20261014150000). Every policy is `can_manage_lesson(lesson_id)`: the
 * lesson's teacher or an admin. A student must get 0 rows — raw transcripts
 * quote third parties by name — and must not be able to write one either.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const BODY = 'Teacher: Hammer to Fall today. Student: sztos, trzeba to nagrać.';

describeIfRls('lesson_transcripts RLS — teacher/admin only', () => {
  let fx: TwoTeacherFixture;
  let transcriptA: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const { data, error } = await fx.service
      .from('lesson_transcripts')
      .insert({
        lesson_id: fx.lessonA.id,
        source: 'wispr',
        external_id: `rls-${fx.lessonA.id}`,
        body: BODY,
        created_by: fx.teacherA.id,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`insert transcript failed: ${error?.message ?? 'no row'}`);
    transcriptA = data.id;
  }, 30_000);

  afterAll(async () => {
    // lessons → lesson_transcripts cascades; fixture cleanup deletes the lessons.
    await fx?.cleanup();
  });

  it("teacher reads their own lesson's transcript", async () => {
    const { data, error } = await fx.teacherA.client
      .from('lesson_transcripts')
      .select('id, body')
      .eq('id', transcriptA)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.body).toBe(BODY);
  });

  it('another teacher CANNOT see it', async () => {
    const { data, error } = await fx.teacherB.client
      .from('lesson_transcripts')
      .select('id')
      .eq('id', transcriptA)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('the student of the lesson gets 0 rows', async () => {
    const { data, error } = await fx.studentA1.client.from('lesson_transcripts').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('the student cannot insert a transcript on their own lesson', async () => {
    const { data, error } = await fx.studentA1.client
      .from('lesson_transcripts')
      .insert({ lesson_id: fx.lessonA.id, source: 'paste', body: BODY })
      .select('id');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("a teacher cannot insert a transcript on another teacher's lesson", async () => {
    const { error } = await fx.teacherA.client
      .from('lesson_transcripts')
      .insert({ lesson_id: fx.lessonB.id, source: 'paste', body: BODY })
      .select('id');
    expect(error).not.toBeNull();
  });

  it('a teacher updates their own transcript and the student still sees nothing', async () => {
    const { error } = await fx.teacherA.client
      .from('lesson_transcripts')
      .update({ summary: 'Queen night' })
      .eq('id', transcriptA);
    expect(error).toBeNull();

    const { data } = await fx.studentA1.client
      .from('lesson_transcripts')
      .select('summary')
      .eq('id', transcriptA);
    expect(data).toEqual([]);
  });
});
