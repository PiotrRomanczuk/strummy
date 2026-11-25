/**
 * RLS-real coverage for the least-privilege pass over baseline objects
 * (migration `20261125190000_least_privilege_baseline_objects.sql`).
 *
 * Views owned by postgres without `security_invoker`, and SECURITY DEFINER
 * functions, are not fenced by RLS — their grants are the only fence. These
 * tests pin that fence from the outside, through PostgREST, the way a browser
 * holding the public anon key or a student's session would reach it:
 *   - `user_overview` is closed to anon and to a signed-in student,
 *   - the service-only functions refuse anon and a student, and still serve
 *     the service role,
 *   - `soft_delete_song_with_cascade` deletes for a teacher and refuses a
 *     student and anon.
 *
 * ## Running this suite
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { describeIfRls, readRlsEnv, seedTwoTeachers, type TwoTeacherFixture } from '../index';

/** Functions that only the service role (and pg_cron) may run. */
const SERVICE_ONLY_RPCS: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['soft_delete_song', { p_song_id: '00000000-0000-0000-0000-000000000000' }],
  ['get_pending_notifications', { batch_size: 1 }],
  ['mark_overdue_assignments', {}],
  ['refresh_song_engagement', {}],
  ['cleanup_auth_rate_limits', {}],
  ['cleanup_old_in_app_notifications', {}],
  ['get_bounce_stats', {}],
  ['get_user_email_count_last_hour', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
  ['get_system_email_count_last_hour', {}],
];

describeIfRls('baseline views and SECURITY DEFINER functions — least privilege', () => {
  let fx: TwoTeacherFixture;
  let anon: SupabaseClient;

  beforeAll(async () => {
    const env = readRlsEnv();
    if (!env) throw new Error('RLS env unavailable inside describeIfRls');
    anon = createClient(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    fx = await seedTwoTeachers();
  }, 60_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  describe('user_overview', () => {
    it('refuses anon a read', async () => {
      const { data, error } = await anon.from('user_overview').select('user_id').limit(1);
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('refuses a signed-in student a read', async () => {
      const { error } = await fx.studentA1.client.from('user_overview').select('user_id').limit(1);
      expect(error?.code).toBe('42501');
    });

    it('refuses anon a write and leaves the profile unchanged', async () => {
      const { error } = await anon
        .from('user_overview')
        .update({ is_admin: true })
        .eq('user_id', fx.studentA1.id);
      expect(error).not.toBeNull();

      const { data } = await fx.service
        .from('profiles')
        .select('is_admin')
        .eq('id', fx.studentA1.id)
        .single();
      expect(data?.is_admin).toBe(false);
    });
  });

  describe('service-only functions', () => {
    it.each(SERVICE_ONLY_RPCS)('refuses anon %s', async (fn, args) => {
      const { error } = await anon.rpc(fn, args);
      expect(error?.code).toBe('42501');
    });

    it.each(SERVICE_ONLY_RPCS)('refuses a signed-in student %s', async (fn, args) => {
      const { error } = await fx.studentA1.client.rpc(fn, args);
      expect(error?.code).toBe('42501');
    });

    it('still serves the service role', async () => {
      const { data, error } = await fx.service.rpc('get_system_email_count_last_hour');
      expect(error).toBeNull();
      expect(typeof data).toBe('number');
    });
  });

  describe('soft_delete_song_with_cascade', () => {
    const isDeleted = async (songId: string): Promise<boolean> => {
      const { data } = await fx.service
        .from('songs')
        .select('deleted_at')
        .eq('id', songId)
        .single();
      return data?.deleted_at != null;
    };

    it('refuses anon and a student, and the song survives', async () => {
      const songId = await fx.seedSong('grants-refused');
      const args = { song_uuid: songId, user_uuid: fx.studentA1.id };

      const anonCall = await anon.rpc('soft_delete_song_with_cascade', args);
      expect(anonCall.error?.code).toBe('42501');

      const studentCall = await fx.studentA1.client.rpc('soft_delete_song_with_cascade', args);
      expect(studentCall.error?.code).toBe('42501');

      expect(await isDeleted(songId)).toBe(false);
    });

    it('deletes for a teacher', async () => {
      const songId = await fx.seedSong('grants-teacher');
      const { data, error } = await fx.teacherA.client.rpc('soft_delete_song_with_cascade', {
        song_uuid: songId,
        user_uuid: fx.teacherA.id,
      });
      expect(error).toBeNull();
      expect(data).toMatchObject({ success: true });
      expect(await isDeleted(songId)).toBe(true);
    });
  });
});
