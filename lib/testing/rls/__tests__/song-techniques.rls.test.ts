/**
 * RLS acceptance tests for `song_techniques` (#1206, migration 20261126140000). Every signed-in user reads the
 * labels of a song they can read (never wider than `songs`); only staff write; anon gets nothing.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const TECHNIQUES = { hammer_pull: 32, slide: 3, dead_note: 541 };

describeIfRls('song_techniques RLS — everyone reads, staff write', () => {
  let fx: TwoTeacherFixture;
  let songId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('techniques');
    const { error } = await fx.service
      .from('song_techniques')
      .insert({ song_id: songId, note_count: 4552, techniques: TECHNIQUES });
    if (error) throw new Error(`insert song_techniques failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    // songs → song_techniques cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it.each(['teacherA', 'teacherB', 'studentA1'] as const)('%s reads the labels', async (who) => {
    const { data, error } = await fx[who].client
      .from('song_techniques')
      .select('note_count, techniques, source')
      .eq('song_id', songId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({ note_count: 4552, techniques: TECHNIQUES, source: 'tab' });
  });

  it('a student cannot write', async () => {
    const { error } = await fx.studentA1.client
      .from('song_techniques')
      .update({ techniques: {} })
      .eq('song_id', songId);
    expect(error).toBeNull(); // RLS filters the row out: nothing is updated
    const { data } = await fx.service
      .from('song_techniques')
      .select('techniques')
      .eq('song_id', songId)
      .single();
    expect(data?.techniques).toEqual(TECHNIQUES);
  });

  it('a student cannot insert', async () => {
    const otherSong = await fx.seedSong('techniques-forged');
    const { error } = await fx.studentA1.client
      .from('song_techniques')
      .insert({ song_id: otherSong, note_count: 10, techniques: {} });
    expect(error).not.toBeNull();
  });

  it('a teacher can update the counts', async () => {
    const { error } = await fx.teacherA.client
      .from('song_techniques')
      .update({ techniques: { ...TECHNIQUES, slide: 4 } })
      .eq('song_id', songId);
    expect(error).toBeNull();
    const { data } = await fx.service
      .from('song_techniques')
      .select('techniques')
      .eq('song_id', songId)
      .single();
    expect(data?.techniques).toEqual({ ...TECHNIQUES, slide: 4 });
  });

  it('rejects a techniques value that is not an object', async () => {
    const { error } = await fx.service
      .from('song_techniques')
      .update({ techniques: [1, 2] })
      .eq('song_id', songId);
    expect(error).not.toBeNull();
  });
});
