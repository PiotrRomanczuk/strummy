import { songCardFromRows } from '@/lib/services/song-card-queries';

import { cardPosition, chordAt, chordsOfBars, nextChord, strumFromRule } from './song-card-clock';
import type { SongCard } from './song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from './song-card.fixture';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;

describe('cardPosition', () => {
  it('places a moment in its bar, sixteenth, half and part', () => {
    // bar 5 (index 4) runs 8.88–10.96: 10.0 s is 0.538 of it → sixteenth 8, second half; the verse.
    expect(cardPosition(card, 10)).toEqual({ bar: 4, slot: 8, half: 1, part: 1 });
  });

  it('is in the first bar without a sixteenth before the first downbeat', () => {
    expect(cardPosition(card, 0.2)).toEqual({ bar: 0, slot: -1, half: 0, part: 0 });
  });

  it('stays in the last sixteenth at the end of the recording', () => {
    expect(cardPosition(card, 20)).toEqual({ bar: 8, slot: 15, half: 1, part: 2 });
  });

  it('has no part on a card without parts', () => {
    expect(cardPosition({ ...card, parts: [] }, 10).part).toBe(-1);
  });
});

describe('chordAt and nextChord', () => {
  it('reads a bar half, a teacher correction wins for the whole bar', () => {
    expect(chordAt(card, 8, 1)).toBe('G');
    expect(chordAt(card, 8, 1, { 8: 'Am' })).toBe('Am');
    expect(chordAt(card, 99, 0)).toBe('N');
  });

  it('finds the next change and how many bars away it is', () => {
    expect(nextChord(card, 3, 0)).toEqual({ chord: 'G', inBars: 3 });
    expect(nextChord(card, 8, 0)).toEqual({ chord: 'G', inBars: 0 });
    expect(nextChord(card, 8, 1)).toBeNull();
  });

  it('follows the corrections', () => {
    expect(nextChord(card, 3, 0, { 4: 'Am' })).toEqual({ chord: 'Am', inBars: 1 });
  });

  it('lists the chords of a run of bars once, in order', () => {
    expect(chordsOfBars(card, 0, 9)).toEqual(['Am', 'F', 'C', 'G']);
    expect(chordsOfBars(card, 3, 8, { 6: 'Em' })).toEqual(['C', 'Em', 'G']);
  });
});

describe('strumFromRule', () => {
  it('strums down on the eighths and up between them, nothing where the hand rests', () => {
    expect(strumFromRule('X.X.x.XX')).toEqual([
      'down',
      null,
      'down',
      null,
      'down',
      null,
      'down',
      'up',
    ]);
  });
});
