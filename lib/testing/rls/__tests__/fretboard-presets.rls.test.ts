/**
 * RLS acceptance test for `fretboard_presets` (migration
 * 20261010120000_fretboard_presets): presets are private to their owner —
 * nobody else can read, insert for, or delete them.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

describeIfRls('fretboard_presets RLS — owner only', () => {
  let fx: TwoTeacherFixture;
  let presetId = '';

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    const { data, error } = await fx.studentA1.client
      .from('fretboard_presets')
      .insert({ profile_id: fx.studentA1.id, name: 'A minor box', query: '?key=A&mode=scale' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`owner insert failed: ${error?.message}`);
    presetId = data.id;
  }, 30_000);

  afterAll(async () => {
    await fx.service.from('fretboard_presets').delete().eq('profile_id', fx.studentA1.id);
    await fx?.cleanup();
  });

  it('the owner reads their preset', async () => {
    const { data, error } = await fx.studentA1.client
      .from('fretboard_presets')
      .select('id')
      .eq('id', presetId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("another student and the owner's teacher cannot read it", async () => {
    for (const client of [fx.studentB1.client, fx.teacherA.client]) {
      const { data } = await client.from('fretboard_presets').select('id').eq('id', presetId);
      expect(data ?? []).toHaveLength(0);
    }
  });

  it('nobody can insert a preset owned by someone else', async () => {
    const { error } = await fx.studentB1.client
      .from('fretboard_presets')
      .insert({ profile_id: fx.studentA1.id, name: 'Sneaky', query: '?key=C' });
    expect(error).not.toBeNull();
  });

  it("another user's delete removes nothing", async () => {
    await fx.studentB1.client.from('fretboard_presets').delete().eq('id', presetId);
    const { data } = await fx.service.from('fretboard_presets').select('id').eq('id', presetId);
    expect(data).toHaveLength(1);
  });
});
