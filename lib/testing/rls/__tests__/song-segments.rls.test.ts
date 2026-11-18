/**
 * RLS acceptance tests for `song_segments` (SNG-16, migration 20261117090000). Staff read
 * (`is_admin_or_teacher()` — the song catalog is shared, so any teacher), nobody but the service role writes:
 * the loader script is the only writer. A student must get 0 rows — a machine analysis of a commercial
 * recording is a teacher's working material, not student material.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const PARTS = [
  {
    n: 1,
    label: 'A',
    name: 'verse',
    repeat_of: null,
    first_bar: 1,
    bars: 4,
    start_s: 0.5,
    end_s: 8.5,
    bpm: 120,
    vocals: true,
    chords: ['Em', 'G', 'Em', 'G'],
    roman: ['vi', 'I', 'vi', 'I'],
    loop: ['vi', 'I'],
    bass: null,
    drums: null,
    levels: {},
  },
];

const SEGMENTS = {
  recording_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  tool_version: 'rls',
  analysed_on: '2026-11-17',
  song_key: 'G major',
  bpm: 120,
  feel: 'straight',
  felt_bpm: 120,
  beats_per_bar: 4,
  part_count: 1,
  parts: PARTS,
  bass_bars: [null],
};

describeIfRls('song_segments RLS — staff read, service role writes', () => {
  let fx: TwoTeacherFixture;
  let songId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('segments');
    const { error } = await fx.service
      .from('song_segments')
      .insert({ song_id: songId, ...SEGMENTS });
    if (error) throw new Error(`insert song_segments failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    // songs → song_segments cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it.each(['teacherA', 'teacherB'] as const)('%s reads the parts', async (who) => {
    const { data, error } = await fx[who].client
      .from('song_segments')
      .select('recording_url, song_key, parts')
      .eq('song_id', songId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({
      recording_url: SEGMENTS.recording_url,
      song_key: 'G major',
      parts: PARTS,
    });
  });

  it('a student gets 0 rows', async () => {
    const { data, error } = await fx.studentA1.client
      .from('song_segments')
      .select('id')
      .eq('song_id', songId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(['teacherA', 'studentA1'] as const)('%s cannot write segments', async (who) => {
    const { error } = await fx[who].client
      .from('song_segments')
      .insert({ song_id: songId, ...SEGMENTS, tool_version: 'forged' });
    expect(error).not.toBeNull();
  });

  it('a teacher cannot change the stored parts', async () => {
    await fx.teacherA.client.from('song_segments').update({ parts: [] }).eq('song_id', songId);
    const { data } = await fx.service
      .from('song_segments')
      .select('parts')
      .eq('song_id', songId)
      .single();
    expect(data?.parts).toEqual(PARTS);
  });
});
