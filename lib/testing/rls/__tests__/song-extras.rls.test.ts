/**
 * RLS-real coverage for the song side tables (#1216): `song_requests`, `song_status_history`,
 * `song_of_the_week`, `song_sections`, `spotify_matches`.
 *
 * Policies (baseline; `song_status_history` last rewritten in `20260727137000_*`,
 * `song_sections` in `20260802160100_song_sections_table.sql`):
 *   - requests and status history belong to one student: they write and read their own, staff read all;
 *   - song of the week and song sections are shared content every signed-in user reads; only
 *     staff (sections) or admins (song of the week) write. They have no owner to hide rows from;
 *   - Spotify match candidates are staff-only.
 *
 * Auto-skips unless an RLS test DB is configured (see `lib/testing/rls/env.ts`).
 */

import { createClient } from '@supabase/supabase-js';

import { describeIfRls, readRlsEnv, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('song side tables RLS', () => {
  let fx: TwoTeacherFixture;
  let songId: string;
  let anon: ReturnType<typeof createClient>;

  beforeAll(async () => {
    const env = readRlsEnv();
    if (!env) throw new Error('RLS env unavailable inside describeIfRls');
    anon = createClient(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('extras');
    const sotw = await fx.service
      .from('song_of_the_week')
      .insert({ song_id: songId, is_active: false });
    if (sotw.error) throw new Error(`seed song_of_the_week failed: ${sotw.error.message}`);
  }, 60_000);

  afterAll(async () => {
    // Status history, song of the week, sections and matches cascade from the fixture song;
    // requests have no cascade from a song, so they go by student.
    if (fx) {
      const { error } = await fx.service
        .from('song_requests')
        .delete()
        .in('student_id', [fx.studentA1.id, fx.studentB1.id]);
      if (error) throw new Error(`song_requests cleanup failed: ${error.message}`);
    }
    await fx?.cleanup();
  });

  describe('song_requests', () => {
    it('a student files a request and sees it; their teacher sees it too', async () => {
      const { error } = await fx.studentA1.client
        .from('song_requests')
        .insert({ student_id: fx.studentA1.id, title: 'RLS requested song' });
      expect(error).toBeNull();
      const own = await fx.studentA1.client.from('song_requests').select('student_id');
      expect(own.data).toEqual([{ student_id: fx.studentA1.id }]);
      const teacher = await fx.teacherA.client
        .from('song_requests')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(teacher.data).toHaveLength(1);
    });

    it("another student neither sees it nor files one in the first student's name", async () => {
      const read = await fx.studentB1.client
        .from('song_requests')
        .select('id')
        .eq('student_id', fx.studentA1.id);
      expect(read.data).toEqual([]);
      const forged = await fx.studentB1.client
        .from('song_requests')
        .insert({ student_id: fx.studentA1.id, title: 'RLS forged request' });
      expect(forged.error).not.toBeNull();
    });

    it('a student cannot approve their own request', async () => {
      const { data } = await fx.studentA1.client
        .from('song_requests')
        .update({ status: 'approved' })
        .eq('student_id', fx.studentA1.id)
        .select('id');
      expect(data).toEqual([]);
    });
  });

  describe('song_status_history', () => {
    const change = (studentId: string) => ({
      student_id: studentId,
      song_id: songId,
      new_status: 'started',
    });

    it('a student records a status change and reads it back', async () => {
      const { error } = await fx.studentA1.client
        .from('song_status_history')
        .insert(change(fx.studentA1.id));
      expect(error).toBeNull();
      const { data } = await fx.studentA1.client
        .from('song_status_history')
        .select('student_id')
        .eq('song_id', songId);
      expect(data).toEqual([{ student_id: fx.studentA1.id }]);
    });

    it("another student neither sees it nor writes one in the first student's name", async () => {
      const read = await fx.studentB1.client
        .from('song_status_history')
        .select('id')
        .eq('song_id', songId);
      expect(read.data).toEqual([]);
      const forged = await fx.studentB1.client
        .from('song_status_history')
        .insert(change(fx.studentA1.id));
      expect(forged.error).not.toBeNull();
    });
  });

  describe('song_of_the_week', () => {
    it('signed-in users read it, anon does not', async () => {
      const student = await fx.studentA1.client
        .from('song_of_the_week')
        .select('id')
        .eq('song_id', songId);
      expect(student.data).toHaveLength(1);
      const visitor = await anon.from('song_of_the_week').select('id').eq('song_id', songId);
      expect(visitor.data ?? []).toEqual([]);
    });

    it('a teacher cannot pick or change it (admins only)', async () => {
      const pick = await fx.teacherA.client
        .from('song_of_the_week')
        .insert({ song_id: songId, is_active: false });
      expect(pick.error).not.toBeNull();
      const change = await fx.teacherA.client
        .from('song_of_the_week')
        .update({ teacher_message: 'changed' })
        .eq('song_id', songId)
        .select('id');
      expect(change.data).toEqual([]);
    });
  });

  describe('song_sections', () => {
    it('a student reads the sections of a song', async () => {
      const seeded = await fx.service
        .from('song_sections')
        .insert({ song_id: songId, section_type: 'verse', order_position: 1 });
      expect(seeded.error).toBeNull();
      const { data } = await fx.studentA1.client
        .from('song_sections')
        .select('section_type')
        .eq('song_id', songId);
      expect(data).toEqual([{ section_type: 'verse' }]);
    });

    // Known bug (#1216), narrower than intended rather than wider: the write policies still look a
    // teacher up through the retired `user_roles` table and the old `profiles.id = auth.uid()`
    // identity, so a teacher created today is refused (saveSongSection writes with the user's
    // client). Drop `it.failing` once the policies use public.is_admin_or_teacher().
    it.failing('a teacher adds a section', async () => {
      const { error } = await fx.teacherA.client
        .from('song_sections')
        .insert({ song_id: songId, section_type: 'bridge', order_position: 3 });
      expect(error).toBeNull();
    });

    it('a student cannot add or change a section', async () => {
      const insert = await fx.studentA1.client
        .from('song_sections')
        .insert({ song_id: songId, section_type: 'chorus', order_position: 2 });
      expect(insert.error).not.toBeNull();
      const update = await fx.studentA1.client
        .from('song_sections')
        .update({ lyrics: 'changed' })
        .eq('song_id', songId)
        .select('id');
      expect(update.data).toEqual([]);
    });
  });

  describe('spotify_matches', () => {
    const match = {
      track_id: 'rls-track',
      track_name: 'RLS track',
      artist_name: 'RLS artist',
      url: 'https://open.spotify.com/track/rls',
      confidence_score: 80,
      search_query: 'rls',
    };

    it('a teacher proposes a match; a student neither sees nor proposes one', async () => {
      const { error } = await fx.teacherA.client
        .from('spotify_matches')
        .insert({ ...match, song_id: songId });
      expect(error).toBeNull();
      const read = await fx.studentA1.client
        .from('spotify_matches')
        .select('id')
        .eq('song_id', songId);
      expect(read.data).toEqual([]);
      const insert = await fx.studentA1.client
        .from('spotify_matches')
        .insert({ ...match, song_id: songId, track_id: 'rls-student-track' });
      expect(insert.error).not.toBeNull();
    });
  });
});
