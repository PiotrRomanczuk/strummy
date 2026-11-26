/**
 * saveSongCardReview: staff only, validated, and the whole review is stored after the change.
 */

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { reviewFromRow, rowFromReview } from '@/lib/services/song-card-review';

import { saveSongCardReview } from './actions';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));

const SONG = '62a9c235-aed2-4912-a78b-0f079079ac92';
const VIDEO = 'bO28lB1uwp4';

function client(stored: unknown, upsertError: unknown = null) {
  const upsert = jest.fn().mockResolvedValue({ error: upsertError });
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: stored, error: null }),
    upsert,
  };
  return { from: () => chain, upsert };
}

const asTeacher = () =>
  jest
    .mocked(getUserWithRolesSSR)
    .mockResolvedValue({ isAdmin: false, isTeacher: true, profileId: 'p1' } as never);

describe('saveSongCardReview', () => {
  it('adds the change to the stored review and saves the whole row', async () => {
    asTeacher();
    const stored = rowFromReview(SONG, VIDEO, {
      approvedGroups: ['verse:I'],
      strums: {},
      chordEdits: {},
    });
    const db = client(stored);
    jest.mocked(createClient).mockResolvedValue(db as never);
    const result = await saveSongCardReview(SONG, VIDEO, { kind: 'chord', bar: 4, chord: 'Am' });
    expect(result).toEqual({
      review: { approvedGroups: ['verse:I'], strums: {}, chordEdits: { 4: 'Am' } },
    });
    expect(db.upsert).toHaveBeenCalledWith({
      song_id: SONG,
      recording_url: `https://www.youtube.com/watch?v=${VIDEO}`,
      approved_groups: ['verse:I'],
      strums: {},
      chord_edits: { '4': 'Am' },
      updated_by: 'p1',
    });
  });

  it('refuses a student and an invalid change without touching the database', async () => {
    jest
      .mocked(getUserWithRolesSSR)
      .mockResolvedValue({ isAdmin: false, isTeacher: false } as never);
    expect(
      await saveSongCardReview(SONG, VIDEO, { kind: 'approve', group: 'x', isApproved: true })
    ).toEqual({
      error: 'forbidden',
    });
    asTeacher();
    expect(
      await saveSongCardReview(SONG, VIDEO, { kind: 'strum', group: 'x', code: 'nope' })
    ).toEqual({
      error: 'invalid',
    });
    expect(
      await saveSongCardReview('not-a-uuid', VIDEO, {
        kind: 'approve',
        group: 'x',
        isApproved: true,
      })
    ).toEqual({ error: 'invalid' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    asTeacher();
    jest.mocked(createClient).mockResolvedValue(client(null, { message: 'rls' }) as never);
    expect(
      await saveSongCardReview(SONG, VIDEO, { kind: 'approve', group: 'x', isApproved: true })
    ).toEqual({
      error: 'failed',
    });
  });
});

describe('reviewFromRow', () => {
  it('ignores a review of another recording', () => {
    const stored = rowFromReview(SONG, 'AAAAAAAAAAA', {
      approvedGroups: ['x'],
      strums: {},
      chordEdits: {},
    });
    expect(reviewFromRow(stored, VIDEO).approvedGroups).toEqual([]);
    expect(reviewFromRow(stored, 'AAAAAAAAAAA').approvedGroups).toEqual(['x']);
  });
});
