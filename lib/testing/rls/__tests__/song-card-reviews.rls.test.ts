/**
 * RLS acceptance tests for `song_card_reviews` (SNG-17, migration 20261123200000). Staff read and write
 * (`is_admin_or_teacher()` — the song catalog is shared, so any teacher reviews any song's card); a student reads
 * and writes nothing directly — the approved card reaches students through a security definer function.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const REVIEW = {
  recording_url: 'https://www.youtube.com/watch?v=bO28lB1uwp4',
  approved_groups: ['verse:I'],
  strums: { 'verse:I': 'd.d.d.d.d.d.d.d.' },
  chord_edits: { '4': 'Am' },
};

describeIfRls('song_card_reviews RLS — staff read and write, students nothing', () => {
  let fx: TwoTeacherFixture;
  let songId: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    songId = await fx.seedSong('card-review');
  }, 30_000);

  afterAll(async () => {
    // songs → song_card_reviews cascades; fixture cleanup deletes the song.
    await fx?.cleanup();
  });

  it('a teacher saves the review and another teacher reads and changes it', async () => {
    const saved = await fx.teacherA.client
      .from('song_card_reviews')
      .upsert({ song_id: songId, ...REVIEW });
    expect(saved.error).toBeNull();

    const read = await fx.teacherB.client
      .from('song_card_reviews')
      .select('approved_groups, strums, chord_edits')
      .eq('song_id', songId)
      .maybeSingle();
    expect(read.error).toBeNull();
    expect(read.data).toEqual({
      approved_groups: REVIEW.approved_groups,
      strums: REVIEW.strums,
      chord_edits: REVIEW.chord_edits,
    });

    const changed = await fx.teacherB.client
      .from('song_card_reviews')
      .update({ approved_groups: [] })
      .eq('song_id', songId)
      .select('approved_groups');
    expect(changed.error).toBeNull();
    expect(changed.data).toEqual([{ approved_groups: [] }]);
  });

  it('a student reads 0 rows and cannot write', async () => {
    const read = await fx.studentA1.client
      .from('song_card_reviews')
      .select('song_id')
      .eq('song_id', songId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const insert = await fx.studentA1.client
      .from('song_card_reviews')
      .upsert({ song_id: songId, ...REVIEW, approved_groups: ['x'] });
    expect(insert.error).not.toBeNull();

    const update = await fx.studentA1.client
      .from('song_card_reviews')
      .update({ approved_groups: ['x'] })
      .eq('song_id', songId)
      .select('song_id');
    expect(update.data ?? []).toEqual([]);
  });
});
