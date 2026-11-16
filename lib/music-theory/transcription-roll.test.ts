import {
  barPosition,
  midiName,
  nominalBarSeconds,
  notesInBars,
  toRollTrack,
  type RollNote,
} from './transcription-roll';

// Bar 2 is longer than the others (3 s instead of 2): a steady tempo would misplace every later note.
const GRID = { bpm: 120, beats_per_bar: 4, downbeats_s: [1, 3, 6, 8] };

describe('barPosition', () => {
  const barSeconds = nominalBarSeconds(GRID);

  it('follows the real downbeats, not a steady tempo', () => {
    expect(barPosition(1, GRID.downbeats_s, barSeconds)).toBe(1);
    expect(barPosition(2, GRID.downbeats_s, barSeconds)).toBe(1.5);
    expect(barPosition(4.5, GRID.downbeats_s, barSeconds)).toBe(2.5); // halfway through the 3-second bar
    expect(barPosition(6, GRID.downbeats_s, barSeconds)).toBe(3);
  });

  it('extends the grid before the first and after the last downbeat with the average bar', () => {
    expect(barSeconds).toBeCloseTo(7 / 3);
    expect(barPosition(0, GRID.downbeats_s, barSeconds)).toBeCloseTo(1 - 3 / 7);
    expect(barPosition(9, GRID.downbeats_s, barSeconds)).toBeCloseTo(4 + 3 / 7);
  });

  it('falls back to the nominal tempo with a single downbeat', () => {
    expect(nominalBarSeconds({ bpm: 120, beats_per_bar: 4, downbeats_s: [1] })).toBe(2);
    expect(nominalBarSeconds({ bpm: null, beats_per_bar: null, downbeats_s: [1] })).toBe(2);
  });
});

describe('toRollTrack', () => {
  it('places each note by its start and end and keeps the range of the whole track', () => {
    const track = toRollTrack(
      [
        [1, 1, 40, 90, 1, 0],
        [4.5, 1.5, 47, 80, 2, 8],
      ],
      GRID
    );
    expect(track.notes).toEqual([
      [1, 1.5, 40],
      [2.5, 3, 47],
    ]);
    expect(track).toMatchObject({ low: 40, high: 47 });
  });

  it('gives an empty track no range', () => {
    expect(toRollTrack([], GRID)).toEqual({ notes: [], low: null, high: null });
  });
});

describe('notesInBars', () => {
  const notes: RollNote[] = [
    [0.8, 1.2, 40], // a pickup that rings into bar 1
    [8.5, 9.5, 41], // crosses into bar 9
    [9, 10, 42],
  ];

  it('takes every note sounding in the window', () => {
    expect(notesInBars(notes, 1, 8)).toEqual([notes[0], notes[1]]);
    expect(notesInBars(notes, 9, 8)).toEqual([notes[1], notes[2]]);
  });
});

describe('midiName', () => {
  it('names a MIDI note with its octave', () => {
    expect(midiName(60)).toBe('C4');
    expect(midiName(45)).toBe('A2');
    expect(midiName(61)).toBe('C#4');
  });
});
