import { partColours, partKind, partLoop, patternCells, riffCells, splitKey } from './song-map';

const note = (slot: number, sixteenths: number, name = 'E2') => ({
  slot,
  sixteenths,
  note: name,
  degree: '1',
});

describe('partKind / partColours', () => {
  it('knows the names allin1 gives and nothing else', () => {
    expect(partKind('chorus')).toBe('chorus');
    expect(partKind('A')).toBeNull();
    expect(partKind(null)).toBeNull();
  });

  it('colours named parts by kind and lettered parts by first appearance', () => {
    const named = [
      { name: 'intro', label: 'A' },
      { name: 'verse', label: 'B' },
      { name: 'verse', label: 'C' },
    ];
    expect(partColours(named, 5)).toEqual([0, 1, 1]);
    const lettered = ['C', 'A', 'C', 'B'].map((label) => ({ name: null, label }));
    expect(partColours(lettered, 5)).toEqual([0, 1, 0, 2]);
  });
});

describe('partLoop', () => {
  it('gives the loop with the chords of its first full run', () => {
    const part = {
      chords: ['G', 'Em', 'C', 'D', 'Em', 'C', 'D', 'Em', 'C', 'D'],
      roman: ['I', 'vi', 'IV', 'V', 'vi', 'IV', 'V', 'vi', 'IV', 'V'],
      loop: ['vi', 'IV', 'V'],
    };
    expect(partLoop(part)).toEqual({
      chords: ['Em', 'C', 'D'],
      roman: ['vi', 'IV', 'V'],
      times: 3,
    });
  });

  it('is null for a part that does not repeat its bars', () => {
    const once = { chords: ['G', 'C', 'D'], roman: ['I', 'IV', 'V'], loop: ['I', 'IV', 'V'] };
    expect(partLoop(once)).toBeNull();
    expect(partLoop({ chords: [], roman: [], loop: [] })).toBeNull();
  });
});

describe('patternCells / riffCells', () => {
  it('turns a pattern into one cell per sixteenth and marks the beats', () => {
    const cells = patternCells('X.x.X...');
    expect(cells.map((c) => c.level)).toEqual([
      'on',
      'off',
      'half',
      'off',
      'on',
      'off',
      'off',
      'off',
    ]);
    expect(cells.filter((c) => c.isBeat)).toHaveLength(2);
  });

  it('stretches a riff note to its length, stopped by the next note and the end of the bar', () => {
    const cells = riffCells([note(0, 6), note(4, 2, 'G2'), note(14, 8, 'B2')], 16, true);
    expect(cells.map((c) => [c.span, c.text])).toEqual([
      [4, 'E2'],
      [2, 'G2'],
      ...Array.from({ length: 8 }, () => [1, '']),
      [2, 'B2'],
    ]);
    expect(cells.reduce((sum, c) => sum + c.span, 0)).toBe(16);
  });

  it('keeps the rhythm without names and ignores a note past the bar', () => {
    const cells = riffCells([note(0, 2), note(20, 2)], 16, false);
    expect(cells[0]).toMatchObject({ span: 2, level: 'on', text: '' });
    expect(cells.reduce((sum, c) => sum + c.span, 0)).toBe(16);
  });
});

describe('splitKey', () => {
  it('reads the tonic and the mode', () => {
    expect(splitKey('F# minor')).toEqual({ tonic: 'F#', isMinor: true });
    expect(splitKey('G major')).toEqual({ tonic: 'G', isMinor: false });
  });
});
