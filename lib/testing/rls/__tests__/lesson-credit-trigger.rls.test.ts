/**
 * Database tests for the lesson-balance trigger (migration 20261114090000).
 * A held lesson on or after the teacher's billing start date costs one lesson;
 * anything else costs nothing, and undoing the answer gives the lesson back.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const START = '2026-11-01';
const BEFORE_START = '2026-10-31T20:00:00Z'; // 21:00 in Warsaw on 31 Oct
const AFTER_START = '2026-10-31T23:30:00Z'; // 00:30 in Warsaw on 1 Nov

describeIfRls('lesson credit trigger', () => {
  let fx: TwoTeacherFixture;

  const balance = async () => {
    const { data, error } = await fx.service
      .from('lesson_credit_entries')
      .select('delta')
      .eq('student_id', fx.studentA1.id);
    if (error) throw new Error(error.message);
    return (data ?? []).reduce((sum, row) => sum + row.delta, 0);
  };

  const setLesson = async (patch: Record<string, unknown>) => {
    const { error } = await fx.service.from('lessons').update(patch).eq('id', fx.lessonA.id);
    if (error) throw new Error(error.message);
  };

  const setStart = async (billingStartOn: string | null) => {
    const { error } = await fx.service
      .from('billing_settings')
      .upsert({ teacher_id: fx.teacherA.id, billing_start_on: billingStartOn });
    if (error) throw new Error(error.message);
  };

  beforeAll(async () => {
    fx = await seedTwoTeachers();
  }, 30_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  beforeEach(async () => {
    await setStart(START);
    await setLesson({ status: 'SCHEDULED', deleted_at: null, scheduled_at: AFTER_START });
  });

  it('a held lesson takes one off the balance, once', async () => {
    await setLesson({ status: 'COMPLETED' });
    expect(await balance()).toBe(-1);

    await setLesson({ notes: 'edited after the lesson' });
    await setLesson({ status: 'COMPLETED' });
    expect(await balance()).toBe(-1);
  });

  it('undoing the answer, cancelling or deleting gives the lesson back', async () => {
    await setLesson({ status: 'COMPLETED' });
    await setLesson({ status: 'SCHEDULED' });
    expect(await balance()).toBe(0);

    await setLesson({ status: 'COMPLETED' });
    await setLesson({ status: 'CANCELLED' });
    expect(await balance()).toBe(0);

    await setLesson({ status: 'COMPLETED' });
    await setLesson({ deleted_at: new Date().toISOString() });
    expect(await balance()).toBe(0);
  });

  it('a lesson before the start date costs nothing — by the Warsaw calendar day', async () => {
    await setLesson({ status: 'COMPLETED', scheduled_at: BEFORE_START });
    expect(await balance()).toBe(0);

    await setLesson({ scheduled_at: AFTER_START });
    expect(await balance()).toBe(-1);
  });

  it('with no start date nothing is charged', async () => {
    await setStart(null);
    await setLesson({ status: 'COMPLETED' });
    expect(await balance()).toBe(0);
  });

  it('moving the start date rebuilds the entries and leaves purchases alone', async () => {
    await setLesson({ status: 'COMPLETED' });
    const { error: manualError } = await fx.service.from('lesson_credit_entries').insert({
      teacher_id: fx.teacherA.id,
      student_id: fx.studentA1.id,
      delta: 4,
      reason: 'manual',
    });
    expect(manualError).toBeNull();
    expect(await balance()).toBe(3);

    await setStart('2026-12-01');
    await fx.service.rpc('rebuild_lesson_credit_entries', { p_teacher_id: fx.teacherA.id });
    expect(await balance()).toBe(4);

    await setStart(START);
    await fx.service.rpc('rebuild_lesson_credit_entries', { p_teacher_id: fx.teacherA.id });
    expect(await balance()).toBe(3);
  });

  it('a signed-in teacher CANNOT call the rebuild', async () => {
    const { error } = await fx.teacherA.client.rpc('rebuild_lesson_credit_entries', {
      p_teacher_id: fx.teacherA.id,
    });
    expect(error).not.toBeNull();
  });
});
