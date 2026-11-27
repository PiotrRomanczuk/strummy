/**
 * RLS-real coverage for the remaining uncovered tables (#1216): `api_keys`, `task_management`,
 * `system_logs`, `lesson_songs` (until now only exercised indirectly).
 *
 * Policies:
 *   - `api_keys` (baseline): keyed by `user_id` = the AUTH uid, readable and writable by its user only;
 *   - `task_management` (`20260727130000_*`): its profile's own rows, admins see all;
 *   - `system_logs` (baseline): admins read; no signed-in user writes (the service role logs);
 *   - `lesson_songs` (`20260718090400_lesson_songs.sql`): participants of the lesson read,
 *     its teacher (or an admin) writes.
 *
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { randomBytes } from 'node:crypto';

import {
  createSignedInRlsUser,
  describeIfRls,
  seedRow,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls('api keys, tasks, system logs and lesson songs RLS', () => {
  let fx: TwoTeacherFixture;
  let admin: SeededUser;
  let songId: string;
  let logId: string;
  const keyHash = () => randomBytes(32).toString('hex');

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    admin = await createSignedInRlsUser(fx.service, 'admin', `other-${Date.now()}`);
    songId = await fx.seedSong('lesson-songs');
    logId = await seedRow(fx.service, 'system_logs', {
      level: 'info',
      prefix: 'rls',
      message: 'RLS system log',
      profile_id: fx.teacherA.id,
    });
  }, 60_000);

  afterAll(async () => {
    // Keys, tasks and lesson songs cascade from their owner, lesson or song; system_logs.profile_id
    // does not cascade, so the seeded log is deleted here. Keys and tasks go explicitly as well.
    if (fx) {
      const users = [fx.teacherA.userId, fx.teacherB.userId, fx.studentA1.userId];
      const profiles = [fx.teacherA.id, fx.teacherB.id, fx.studentA1.id, fx.studentB1.id];
      const results = await Promise.all([
        fx.service.from('system_logs').delete().eq('id', logId),
        fx.service.from('api_keys').delete().in('user_id', users),
        fx.service.from('task_management').delete().in('profile_id', profiles),
      ]);
      const failed = results.find((result) => result.error)?.error;
      if (failed) throw new Error(`cleanup failed: ${failed.message}`);
    }
    if (admin?.userId) {
      const { error } = await fx.service.auth.admin.deleteUser(admin.userId);
      if (error) throw new Error(`admin cleanup failed: ${error.message}`);
    }
    await fx?.cleanup();
  });

  describe('api_keys', () => {
    it('a user creates and lists their own key', async () => {
      const { error } = await fx.teacherA.client
        .from('api_keys')
        .insert({ user_id: fx.teacherA.userId, name: 'RLS key', key_hash: keyHash() });
      expect(error).toBeNull();
      const { data } = await fx.teacherA.client.from('api_keys').select('user_id');
      expect(data).toEqual([{ user_id: fx.teacherA.userId }]);
    });

    it("another user neither sees, revokes nor creates a key in the first user's name", async () => {
      const read = await fx.teacherB.client
        .from('api_keys')
        .select('id')
        .eq('user_id', fx.teacherA.userId);
      expect(read.data).toEqual([]);
      const revoke = await fx.teacherB.client
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', fx.teacherA.userId)
        .select('id');
      expect(revoke.data).toEqual([]);
      const forged = await fx.studentA1.client
        .from('api_keys')
        .insert({ user_id: fx.teacherA.userId, name: 'RLS forged key', key_hash: keyHash() });
      expect(forged.error).not.toBeNull();
    });
  });

  describe('task_management', () => {
    it("a user keeps their own tasks; another user neither sees nor creates them in the owner's name", async () => {
      const own = await fx.teacherA.client
        .from('task_management')
        .insert({ profile_id: fx.teacherA.id, title: 'RLS task' })
        .select('id')
        .single();
      expect(own.error).toBeNull();

      const read = await fx.teacherB.client
        .from('task_management')
        .select('id')
        .eq('id', own.data!.id);
      expect(read.data).toEqual([]);
      const forged = await fx.studentA1.client
        .from('task_management')
        .insert({ profile_id: fx.teacherA.id, title: 'RLS forged task' });
      expect(forged.error).not.toBeNull();

      const byAdmin = await admin.client
        .from('task_management')
        .select('id')
        .eq('id', own.data!.id);
      expect(byAdmin.data).toHaveLength(1);
    });
  });

  describe('system_logs', () => {
    it('only an admin reads logs, even the ones about the reader', async () => {
      const teacher = await fx.teacherA.client.from('system_logs').select('id').eq('id', logId);
      expect(teacher.data).toEqual([]);
      const byAdmin = await admin.client.from('system_logs').select('id').eq('id', logId);
      expect(byAdmin.data).toHaveLength(1);
    });

    it('a signed-in user cannot write a log line', async () => {
      const { error } = await fx.teacherA.client
        .from('system_logs')
        .insert({ level: 'error', prefix: 'rls', message: 'RLS forged log' });
      expect(error).not.toBeNull();
    });
  });

  describe('lesson_songs', () => {
    it("the lesson's teacher adds a song; the lesson's student sees it", async () => {
      const { error } = await fx.teacherA.client
        .from('lesson_songs')
        .insert({ lesson_id: fx.lessonA.id, song_id: songId });
      expect(error).toBeNull();
      const { data } = await fx.studentA1.client
        .from('lesson_songs')
        .select('song_id')
        .eq('lesson_id', fx.lessonA.id);
      expect(data).toEqual([{ song_id: songId }]);
    });

    it('another teacher and another student see nothing of it', async () => {
      for (const who of [fx.teacherB, fx.studentB1]) {
        const { data } = await who.client
          .from('lesson_songs')
          .select('id')
          .eq('lesson_id', fx.lessonA.id);
        expect(data).toEqual([]);
      }
    });

    it("neither another teacher nor the lesson's student can change the lesson's songs", async () => {
      const foreign = await fx.teacherB.client
        .from('lesson_songs')
        .insert({ lesson_id: fx.lessonA.id, song_id: await fx.seedSong('lesson-songs-foreign') });
      expect(foreign.error).not.toBeNull();
      const student = await fx.studentA1.client
        .from('lesson_songs')
        .update({ notes: 'changed' })
        .eq('lesson_id', fx.lessonA.id)
        .select('id');
      expect(student.data).toEqual([]);
    });
  });
});
