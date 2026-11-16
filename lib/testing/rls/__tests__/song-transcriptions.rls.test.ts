/**
 * RLS acceptance tests for `song_transcriptions` (SNG-12, migration 20261116090000). Staff read
 * (`is_admin_or_teacher()` — the song catalog is shared, so any teacher), nobody but the service role writes:
 * the loader script is the only writer. A student must get 0 rows — a machine transcription of a commercial
 * recording is a teacher's working material, not student material.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const TRANSCRIPTION = {
  recording_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  tool_version: 'rls',
  transcribed_on: '2026-11-15',
  note_count: 1,
  grid: { bpm: 120, beats_per_bar: 4, downbeats_s: [0.5, 2.5] },
  tracks: { Bas: [[0.5, 0.25, 40, 90, 1, 0]] },
  stats: { Bas: { notes: 1, low: 40, high: 40, median: 40, per_bar: 0.5, active_share: 0.5 } },
};

describeIfRls('song_transcriptions RLS — staff read, service role writes', () => {
  let fx: TwoTeacherFixture;
  let songId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('transcription');
    const { error } = await fx.service
      .from('song_transcriptions')
      .insert({ song_id: songId, ...TRANSCRIPTION });
    if (error) throw new Error(`insert song_transcriptions failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    // songs → song_transcriptions cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it.each(['teacherA', 'teacherB'] as const)('%s reads the bass track', async (who) => {
    const { data, error } = await fx[who].client
      .from('song_transcriptions')
      .select('recording_url, bass:tracks->Bas')
      .eq('song_id', songId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({
      recording_url: TRANSCRIPTION.recording_url,
      bass: TRANSCRIPTION.tracks.Bas,
    });
  });

  it('a student gets 0 rows', async () => {
    const { data, error } = await fx.studentA1.client
      .from('song_transcriptions')
      .select('id')
      .eq('song_id', songId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(['teacherA', 'studentA1'] as const)('%s cannot write a transcription', async (who) => {
    const { error } = await fx[who].client
      .from('song_transcriptions')
      .insert({ song_id: songId, ...TRANSCRIPTION, tool_version: 'forged' });
    expect(error).not.toBeNull();
  });

  it('a teacher cannot change the stored notes', async () => {
    await fx.teacherA.client
      .from('song_transcriptions')
      .update({ tracks: { Bas: [] } })
      .eq('song_id', songId);
    const { data } = await fx.service
      .from('song_transcriptions')
      .select('tracks')
      .eq('song_id', songId)
      .single();
    expect(data?.tracks).toEqual(TRANSCRIPTION.tracks);
  });
});
