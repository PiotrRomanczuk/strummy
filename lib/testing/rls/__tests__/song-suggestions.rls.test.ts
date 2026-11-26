/**
 * RLS acceptance tests for `song_suggestions` (SNG-15, migration 20261116120000). AI proposals are the admin's
 * working material: only an admin reads, writes or decides them. A teacher and a student get 0 rows and cannot
 * insert or change one. The generating script writes with the service role.
 */

import {
  createSignedInRlsUser,
  describeIfRls,
  seedTwoTeachers,
  type SeededUser,
  type TwoTeacherFixture,
} from '../index';

describeIfRls('song_suggestions RLS — admin only', () => {
  let fx: TwoTeacherFixture;
  let admin: SeededUser | null = null;
  let songId: string;
  let suggestionId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    admin = await createSignedInRlsUser(fx.service, 'admin', 'suggestions-admin');
    songId = await fx.seedSong('suggestions');
    const { data, error } = await fx.service
      .from('song_suggestions')
      .insert({ song_id: songId, field: 'category', value: 'Rock', confidence: 0.9, source: 'rls' })
      .select('id')
      .single();
    if (error) throw new Error(`insert song_suggestions failed: ${error.message}`);
    suggestionId = data.id;
  }, 30_000);

  afterAll(async () => {
    if (admin) await fx.service.auth.admin.deleteUser(admin.userId);
    // songs → song_suggestions cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it('an admin reads and decides a proposal', async () => {
    const read = await admin!.client
      .from('song_suggestions')
      .select('value')
      .eq('id', suggestionId);
    expect(read.data).toEqual([{ value: 'Rock' }]);
    const decided = await admin!.client
      .from('song_suggestions')
      .update({ status: 'rejected' })
      .eq('id', suggestionId)
      .select('status');
    expect(decided.data).toEqual([{ status: 'rejected' }]);
  });

  it.each(['teacherA', 'studentA1'] as const)('%s gets 0 rows and cannot write', async (who) => {
    const client = fx[who].client;
    const { data, error } = await client
      .from('song_suggestions')
      .select('id')
      .eq('song_id', songId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const insert = await client
      .from('song_suggestions')
      .insert({
        song_id: songId,
        field: 'level',
        value: 'starter',
        confidence: 1,
        source: 'forged',
      });
    expect(insert.error).not.toBeNull();
  });
});
