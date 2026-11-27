import { songCardFromRows } from '@/lib/services/song-card-queries';

import type { SongCard } from './song-card';
import { chordNotes, nextStep, secondsAt } from './song-card-backing';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from './song-card.fixture';

const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW) as SongCard;

describe('chordNotes', () => {
  it('strums the stored shape string by string, low E first, muted strings left out', () => {
    expect(chordNotes('C')).toEqual([48, 52, 55, 60, 64]);
    expect(chordNotes('Am')).toEqual([45, 52, 57, 60, 64]);
  });

  it('strums the shape the shared lookup finds: barres, enharmonics, folded extensions', () => {
    expect(chordNotes('Bb')).toEqual([46, 53, 58, 62, 65]);
    expect(chordNotes('A#')).toEqual(chordNotes('Bb'));
    expect(chordNotes('Ebm7')).toEqual(chordNotes('Ebm'));
  });

  it('falls back to a triad for a chord without a stored shape', () => {
    expect(chordNotes('Bbm7b5')).toEqual([58, 61, 65, 70]);
  });

  it('plays nothing for no chord or a name it cannot read', () => {
    expect(chordNotes('N')).toEqual([]);
    expect(chordNotes('???')).toEqual([]);
  });
});

describe('nextStep', () => {
  it('moves a sixteenth at a time and over the bar line', () => {
    expect(nextStep(card, { bar: 2, slot: 4 }, null)).toEqual({ bar: 2, slot: 5 });
    expect(nextStep(card, { bar: 2, slot: 15 }, null)).toEqual({ bar: 3, slot: 0 });
  });

  it('goes back to the loop start after its last bar', () => {
    expect(nextStep(card, { bar: 7, slot: 15 }, { firstBar: 3, lastBar: 7 })).toEqual({
      bar: 3,
      slot: 0,
    });
  });

  it('ends after the last bar of the song', () => {
    expect(nextStep(card, { bar: 8, slot: 15 }, null)).toBeNull();
  });
});

describe('secondsAt', () => {
  it('places a sixteenth inside its bar of the recording', () => {
    // bar index 1 runs 2.68–4.74: its eighth sixteenth is halfway.
    expect(secondsAt(card, { bar: 1, slot: 8 })).toBeCloseTo(3.71, 2);
  });

  it('is the end of the recording past the last bar', () => {
    expect(secondsAt(card, { bar: 99, slot: 0 })).toBe(20);
  });
});
