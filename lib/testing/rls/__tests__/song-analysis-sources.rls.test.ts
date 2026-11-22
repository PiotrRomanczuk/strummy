/**
 * RLS acceptance tests for `song_analysis_sources` (SNG-7, migration 20261113140000). Staff read
 * (`is_admin_or_teacher()` — the song catalog is shared, so any teacher), nobody but the service role
 * writes: the loader script is the only writer. A student must get 0 rows — the chord review is a teacher's
 * working note, not student material.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const REVIEW = { version: 1, status: 'conflict', reference: 'chord-id' };

describeIfRls('song_analysis_sources RLS — staff read, service role writes', () => {
  let fx: TwoTeacherFixture;
  let songId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('analysis-sources');
    const { error } = await fx.service.from('song_analysis_sources').insert({
      song_id: songId,
      source: 'chord-compare',
      tool_version: 'rls',
      payload: REVIEW,
    });
    if (error) throw new Error(`insert song_analysis_sources failed: ${error.message}`);
  }, 30_000);

  afterAll(async () => {
    // songs → song_analysis_sources cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it.each(['teacherA', 'teacherB'] as const)('%s reads the review', async (who) => {
    const { data, error } = await fx[who].client
      .from('song_analysis_sources')
      .select('source, payload')
      .eq('song_id', songId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toEqual({ source: 'chord-compare', payload: REVIEW });
  });

  it('a student gets 0 rows', async () => {
    const { data, error } = await fx.studentA1.client
      .from('song_analysis_sources')
      .select('id')
      .eq('song_id', songId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(['teacherA', 'studentA1'] as const)('%s cannot write a source', async (who) => {
    const { error } = await fx[who].client
      .from('song_analysis_sources')
      .insert({ song_id: songId, source: 'chord-id', tool_version: 'rls', payload: {} });
    expect(error).not.toBeNull();
  });

  it('a teacher cannot change the stored review', async () => {
    await fx.teacherA.client
      .from('song_analysis_sources')
      .update({ payload: { status: 'agree' } })
      .eq('song_id', songId);
    const { data } = await fx.service
      .from('song_analysis_sources')
      .select('payload')
      .eq('song_id', songId)
      .single();
    expect(data?.payload).toEqual(REVIEW);
  });
});
