/**
 * RLS acceptance tests for `song_exercises` (#1146, migration 20261126120000). Staff read, add, change and delete
 * (`is_admin_or_teacher()` — the song catalog is shared, so any teacher uses any song's exercises); a student reads
 * and writes nothing in this slice. NOT RUN when written: the table is not on the dev database until the PR merges.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const EXERCISE = {
  recording_url: 'https://www.youtube.com/watch?v=bO28lB1uwp4',
  part_n: 2,
  name: 'Main riff',
  kind: 'riff',
  tempo_percent: 60,
  source: 'backing',
  note: 'slowly',
};

describeIfRls('song_exercises RLS — staff read and write, students nothing', () => {
  let fx: TwoTeacherFixture;
  let songId: string;
  let exerciseId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('song-exercises');
  }, 30_000);

  afterAll(async () => {
    // songs → song_exercises cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it('a teacher saves an exercise, another teacher reads and changes it', async () => {
    const saved = await fx.teacherA.client
      .from('song_exercises')
      .insert({ song_id: songId, ...EXERCISE })
      .select('id, created_by')
      .single();
    expect(saved.error).toBeNull();
    exerciseId = saved.data?.id ?? '';
    expect(exerciseId).not.toBe('');

    const read = await fx.teacherB.client
      .from('song_exercises')
      .select('name, kind, tempo_percent, source')
      .eq('id', exerciseId)
      .maybeSingle();
    expect(read.data).toEqual({
      name: 'Main riff',
      kind: 'riff',
      tempo_percent: 60,
      source: 'backing',
    });

    const changed = await fx.teacherB.client
      .from('song_exercises')
      .update({ tempo_percent: 80 })
      .eq('id', exerciseId)
      .select('tempo_percent');
    expect(changed.data).toEqual([{ tempo_percent: 80 }]);
  });

  it('refuses a second exercise with the same name on the same part, and values out of range', async () => {
    const duplicate = await fx.teacherA.client
      .from('song_exercises')
      .insert({ song_id: songId, ...EXERCISE });
    expect(duplicate.error?.code).toBe('23505');

    const slow = await fx.teacherA.client
      .from('song_exercises')
      .insert({ song_id: songId, ...EXERCISE, name: 'Too slow', tempo_percent: 10 });
    expect(slow.error).not.toBeNull();
  });

  it('a student reads 0 rows and cannot write or delete', async () => {
    const read = await fx.studentA1.client
      .from('song_exercises')
      .select('id')
      .eq('song_id', songId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const insert = await fx.studentA1.client
      .from('song_exercises')
      .insert({ song_id: songId, ...EXERCISE, name: 'By a student' });
    expect(insert.error).not.toBeNull();

    const update = await fx.studentA1.client
      .from('song_exercises')
      .update({ name: 'x' })
      .eq('id', exerciseId)
      .select('id');
    expect(update.data ?? []).toEqual([]);

    const remove = await fx.studentA1.client
      .from('song_exercises')
      .delete()
      .eq('id', exerciseId)
      .select('id');
    expect(remove.data ?? []).toEqual([]);
  });

  it('a teacher deletes the exercise', async () => {
    const removed = await fx.teacherB.client
      .from('song_exercises')
      .delete()
      .eq('id', exerciseId)
      .select('id');
    expect(removed.error).toBeNull();
    expect(removed.data).toEqual([{ id: exerciseId }]);
  });
});
