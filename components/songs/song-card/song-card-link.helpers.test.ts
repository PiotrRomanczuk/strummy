import { songCardFromRows } from '@/lib/services/song-card-queries';
import type { SongCard } from '@/lib/music-theory/song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from '@/lib/music-theory/song-card.fixture';

import { cardLink, nearestRate, parseCardStart, practiceRates } from './song-card-link.helpers';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;

describe('song card link', () => {
  it('reads a part by its number, the loop and the tempo', () => {
    expect(parseCardStart({ part: '2', loop: '1', tempo: '75' }, card)).toEqual({
      part: 1,
      isLooping: true,
      rate: 0.75,
    });
  });

  it('ignores what does not fit: unknown part, loop without a part, tempo out of range', () => {
    expect(parseCardStart({ part: '9', loop: '1', tempo: '35' }, card)).toEqual({
      part: null,
      isLooping: false,
      rate: 1,
    });
    expect(parseCardStart({ tempo: ['60', '90'] }, null)).toEqual({
      part: null,
      isLooping: false,
      rate: 0.6,
    });
  });

  it('writes only what differs from the default', () => {
    const path = '/dashboard/songs/s1/card';
    expect(cardLink(path, card, { part: 1, isLooping: true, rate: 0.75 })).toBe(
      `${path}?part=2&loop=1&tempo=75`
    );
    expect(cardLink(path, card, { part: null, isLooping: true, rate: 1 })).toBe(path);
  });
});

describe('practice rates', () => {
  it('keeps the player speeds between half and full speed', () => {
    expect(practiceRates([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2])).toEqual([0.5, 0.75, 1]);
    expect(practiceRates([])).toEqual([1]);
  });

  it('cuts fine steps down to the practice ladder', () => {
    const fine = Array.from({ length: 36 }, (_, i) => Math.round((0.25 + i * 0.05) * 100) / 100);
    expect(practiceRates(fine)).toEqual([0.5, 0.6, 0.75, 0.9, 1]);
  });

  it('picks the closest supported speed that is not faster', () => {
    expect(nearestRate([0.5, 0.75, 1], 0.6)).toBe(0.5);
    expect(nearestRate([0.5, 0.75, 1], 0.75)).toBe(0.75);
    expect(nearestRate([0.75, 1], 0.5)).toBe(0.75);
  });
});
