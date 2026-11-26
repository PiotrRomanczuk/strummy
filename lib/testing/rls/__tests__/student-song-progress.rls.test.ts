/**
 * RLS acceptance tests for `student_song_progress` (#1136, migration 20261126100000): an append-only history.
 * The teacher of the student writes and reads; the student and a parent read; nobody updates; the marker
 * (or an admin) may delete a row.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls(
  'student_song_progress RLS — teacher writes, student and parent read, no update',
  () => {
    let fx: TwoTeacherFixture;
    let parent: SeededUser;
    let songId: string;

    const mark = (marker: SeededUser, tempo: number, label: string | null = 'A') => ({
      student_id: fx.studentA1.id,
      song_id: songId,
      part_label: label,
      tempo_percent: tempo,
      marked_by: marker.id,
    });

    const readableBy = async (user: SeededUser) =>
      (await user.client.from('student_song_progress').select('id').eq('song_id', songId)).data ??
      [];

    beforeAll(async () => {
      fx = await seedTwoTeachers();
      songId = await fx.seedSong('song-progress');
      parent = await createSignedInRlsUser(fx.service, 'student', 'progress-parent');
      const linked = await Promise.all([
        fx.service.from('profiles').update({ is_parent: true }).eq('id', parent.id),
        fx.service.from('profiles').update({ parent_id: parent.id }).eq('id', fx.studentA1.id),
      ]);
      const failed = linked.find((result) => result.error);
      if (failed?.error) throw new Error(`link parent failed: ${failed.error.message}`);
    }, 30_000);

    afterAll(async () => {
      await fx?.service.from('profiles').update({ parent_id: null }).eq('id', fx.studentA1.id);
      await fx?.service.auth.admin.deleteUser(parent.userId);
      // songs → student_song_progress cascades; fixture cleanup deletes the song and the users.
      await fx?.cleanup();
    });

    it('the teacher of the student marks a part and reads it back', async () => {
      const inserted = await fx.teacherA.client
        .from('student_song_progress')
        .insert(mark(fx.teacherA, 80));
      expect(inserted.error).toBeNull();
      expect((await readableBy(fx.teacherA)).length).toBeGreaterThanOrEqual(1);
    });

    it('another teacher reads nothing and cannot mark the student', async () => {
      expect(await readableBy(fx.teacherB)).toEqual([]);
      const inserted = await fx.teacherB.client.from('student_song_progress').insert({
        ...mark(fx.teacherB, 100),
      });
      expect(inserted.error).not.toBeNull();
    });

    it('a teacher cannot mark in the name of another profile', async () => {
      const inserted = await fx.teacherA.client
        .from('student_song_progress')
        .insert(mark(fx.teacherB, 100));
      expect(inserted.error).not.toBeNull();
    });

    it('the student reads their own marks and cannot write', async () => {
      expect((await readableBy(fx.studentA1)).length).toBeGreaterThanOrEqual(1);
      const inserted = await fx.studentA1.client
        .from('student_song_progress')
        .insert(mark(fx.studentA1, 100));
      expect(inserted.error).not.toBeNull();
      expect(await readableBy(fx.studentB1)).toEqual([]);
    });

    it('a parent reads the marks of their child', async () => {
      expect((await readableBy(parent)).length).toBeGreaterThanOrEqual(1);
    });

    it('nobody can update a mark, the history is immutable', async () => {
      for (const user of [fx.teacherA, fx.studentA1, parent]) {
        const updated = await user.client
          .from('student_song_progress')
          .update({ tempo_percent: 150 })
          .eq('song_id', songId)
          .select('id');
        expect(updated.data ?? []).toEqual([]);
      }
      const { data } = await fx.service
        .from('student_song_progress')
        .select('tempo_percent')
        .eq('song_id', songId);
      expect((data ?? []).every((row) => row.tempo_percent !== 150)).toBe(true);
    });

    it('only the marker deletes a mark (undo a mis-tap)', async () => {
      const created = await fx.teacherA.client
        .from('student_song_progress')
        .insert(mark(fx.teacherA, 60, 'B'))
        .select('id')
        .single();
      expect(created.error).toBeNull();
      const id = created.data?.id as string;

      const byOther = await fx.teacherB.client
        .from('student_song_progress')
        .delete()
        .eq('id', id)
        .select('id');
      expect(byOther.data ?? []).toEqual([]);

      const byMarker = await fx.teacherA.client
        .from('student_song_progress')
        .delete()
        .eq('id', id)
        .select('id');
      expect(byMarker.error).toBeNull();
      expect(byMarker.data).toEqual([{ id }]);
    });
  }
);
