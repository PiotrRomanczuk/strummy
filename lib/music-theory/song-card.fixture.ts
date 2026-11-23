import type { SongPart } from '@/schemas/SongSegmentsSchema';

/**
 * Song-card rows in the shape song2logic writes them: the first nine bars of a C-major song in 4/4 at ~115 BPM —
 * a 3-bar intro (Am F C), a verse (C ×4, G ×2) and a 1-bar chorus start (F | G halves).
 */
export const CARD_ANALYSIS_ROW = {
  source_url: 'https://www.youtube.com/watch?v=bO28lB1uwp4',
  updated_at: '2026-11-23T10:00:00+00:00',
  created: '2026-11-22',
  duration_s: 20,
  grid: {
    bpm: 115.38,
    beats_per_bar: 4,
    beats_s: [0.6, 1.12, 1.64, 2.16],
    downbeats_s: [0.6, 2.68, 4.74, 6.8, 8.88, 10.96, 13.02, 15.12, 17.16],
  },
  key: { tonic: 'C', scale: 'major' },
  chords: [
    { bar: 1, chord: 'Am', halves: ['Am', 'Am'] },
    { bar: 2, chord: 'F', halves: ['F', 'F'] },
    { bar: 3, chord: 'C', halves: ['C', 'C'] },
    { bar: 4, chord: 'C', halves: ['C', 'C'] },
    { bar: 5, chord: 'C', halves: ['C', 'C'] },
    { bar: 6, chord: 'C', halves: ['C', 'C'] },
    { bar: 7, chord: 'G', halves: ['G', 'G'] },
    { bar: 8, chord: 'G', halves: ['G', 'G'] },
    { bar: 9, chord: 'F', halves: ['F', 'G'] },
  ],
  rhythm: [
    { track: 'Gitara', pattern: 'X.X.X.X.X.X.X.X.' },
    { track: 'Bas', pattern: 'X.....X.X...x.x.' },
  ],
  capo: { fret: 5, shapes: { Am: 'Em', F: 'C', C: 'G', G: 'D' } },
};

const part = (
  over: Partial<SongPart> & Pick<SongPart, 'n' | 'name' | 'first_bar' | 'bars'>
): SongPart => ({
  label: 'A',
  repeat_of: null,
  start_s: 0,
  end_s: 0,
  bpm: 115.4,
  vocals: true,
  chords: [],
  roman: [],
  loop: [],
  drums: null,
  levels: {},
  bass: null,
  ...over,
});

export const CARD_PARTS: SongPart[] = [
  part({
    n: 1,
    name: 'intro',
    first_bar: 1,
    bars: 3,
    start_s: 0.6,
    end_s: 6.8,
    chords: ['Am', 'F', 'C'],
    roman: ['vi', 'IV', 'I'],
    loop: ['vi', 'IV', 'I'],
  }),
  part({
    n: 2,
    name: 'verse',
    label: 'B',
    first_bar: 4,
    bars: 5,
    start_s: 6.8,
    end_s: 17.16,
    chords: ['C', 'C', 'C', 'G', 'G'],
    roman: ['I', 'I', 'I', 'V', 'V'],
    loop: ['I'],
  }),
  part({
    n: 3,
    name: 'chorus',
    label: 'C',
    first_bar: 9,
    bars: 1,
    start_s: 17.16,
    end_s: 20,
    chords: ['F'],
    roman: ['IV'],
    loop: ['IV'],
  }),
];

export const CARD_SEGMENTS_ROW = {
  recording_url: 'https://youtu.be/bO28lB1uwp4',
  parts: CARD_PARTS,
  bass_bars: [
    null,
    [[{ slot: 0, sixteenths: 6, note: 'C2', degree: '1' }], [], [], [], []],
    [[{ slot: 0, sixteenths: 8, note: 'F2', degree: '1' }]],
  ],
};
