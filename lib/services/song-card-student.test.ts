/**
 * getSongCardForStudent: the student's card comes from one RPC; nothing there or a failure means no card.
 */

import { createClient } from '@/lib/supabase/server';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { getSongCardForStudent } from './song-card-student';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const rpcReturning = (data: unknown, error: unknown = null, tempo: number | null = null) => {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: { tempo }, error: null }),
  };
  jest.mocked(createClient).mockResolvedValue({ rpc, from: () => chain } as never);
  return rpc;
};

describe('getSongCardForStudent', () => {
  it('builds the card and the review from the function result', async () => {
    const rpc = rpcReturning({
      analysis: CARD_ANALYSIS_ROW,
      segments: CARD_SEGMENTS_ROW,
      review: {
        recording_url: CARD_ANALYSIS_ROW.source_url,
        approved_groups: ['verse:I'],
        strums: {},
        chord_edits: { '3': 'G' },
      },
    });
    const result = await getSongCardForStudent('s1');
    expect(rpc).toHaveBeenCalledWith('song_card_for_student', { p_song_id: 's1' });
    expect(result?.card.parts).toHaveLength(3);
    expect(result?.review).toEqual({
      approvedGroups: ['verse:I'],
      strums: {},
      chordEdits: { 3: 'G' },
    });
  });

  it("shows the card's tempo at the song's pulse", async () => {
    rpcReturning({ analysis: CARD_ANALYSIS_ROW, segments: null, review: null }, null, 230);
    const result = await getSongCardForStudent('s1');
    expect(result?.card.tempo).toMatchObject({ bpm: 230.76, countedBpm: 115.38, scale: 2 });
  });

  it('is null when the function answers null or fails', async () => {
    rpcReturning(null);
    expect(await getSongCardForStudent('s1')).toBeNull();
    rpcReturning(null, { message: 'boom' });
    expect(await getSongCardForStudent('s1')).toBeNull();
  });
});
