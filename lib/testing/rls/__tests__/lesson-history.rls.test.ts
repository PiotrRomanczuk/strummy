/**
 * RLS-real coverage for `lesson_history` (policy "Users can view lesson
 * history", migration `20261125190000_least_privilege_baseline_objects.sql`).
 *
 * A history row carries before/after snapshots of a lesson, so it must be
 * exactly as visible as the lesson itself:
 *   - the lesson's teacher and student see it,
 *   - another teacher and another teacher's student do not,
 *   - anon does not.
 *
 * ## Running this suite
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { describeIfRls, readRlsEnv, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('lesson_history RLS — visible with the lesson', () => {
  let fx: TwoTeacherFixture;
  let anon: SupabaseClient;
  let historyId: string;

  const readsHistory = async (client: SupabaseClient): Promise<number> => {
    const { data, error } = await client.from('lesson_history').select('id').eq('id', historyId);
    expect(error).toBeNull();
    return data?.length ?? 0;
  };

  beforeAll(async () => {
    const env = readRlsEnv();
    if (!env) throw new Error('RLS env unavailable inside describeIfRls');
    anon = createClient(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    fx = await seedTwoTeachers();

    // Rows go away with the lesson (ON DELETE CASCADE), so cleanup() covers them.
    const { data, error } = await fx.service
      .from('lesson_history')
      .insert({
        lesson_id: fx.lessonA.id,
        changed_by: fx.teacherA.id,
        change_type: 'updated',
        previous_data: { notes: 'before' },
        new_data: { notes: 'after' },
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`seed lesson_history failed: ${error?.message}`);
    historyId = data.id;
  }, 60_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  it("shows the row to the lesson's teacher", async () => {
    expect(await readsHistory(fx.teacherA.client)).toBe(1);
  });

  it("shows the row to the lesson's student", async () => {
    expect(await readsHistory(fx.studentA1.client)).toBe(1);
  });

  it('hides the row from another teacher', async () => {
    expect(await readsHistory(fx.teacherB.client)).toBe(0);
  });

  it("hides the row from another teacher's student", async () => {
    expect(await readsHistory(fx.studentB1.client)).toBe(0);
  });

  it('hides the row from anon', async () => {
    const { data } = await anon.from('lesson_history').select('id').eq('id', historyId);
    expect(data ?? []).toHaveLength(0);
  });
});
