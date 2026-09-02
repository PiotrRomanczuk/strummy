import { getScaleNotes, getChordNotes } from '@/lib/music-theory';

import { DISPLAY_STRINGS } from './fretboard.constants';
import {
  annotateBoard,
  normalizeKey,
  parseStateFromSearch,
  shareLink,
  stateToSearch,
  FRET_COLUMNS,
  FRETBOARD_PATHS,
  type FretState,
} from './fretboard.helpers';

const DEFAULT: FretState = {
  key: 'A',
  mode: 'scale',
  scaleKey: 'pentatonic_minor',
  chordKey: 'minor',
  caged: 'none',
  style: 'engraved',
};

describe('annotateBoard', () => {
  it('builds a 6-string grid with an open-string column', () => {
    const board = annotateBoard('A', getScaleNotes('A', 'pentatonic_minor'));
    expect(board).toHaveLength(DISPLAY_STRINGS.length);
    board.forEach((row) => expect(row).toHaveLength(FRET_COLUMNS));
    // Column 0 is the open string: high e on top, low E at the bottom.
    expect(board[0][0].note).toBe('E');
    expect(board[4][0].note).toBe('A');
  });

  it('flags the root, scale membership, and interval names', () => {
    const board = annotateBoard('A', getScaleNotes('A', 'pentatonic_minor'));
    // High-E string (row 0), fret 5 → A (the root).
    const rootCell = board[0][5];
    expect(rootCell.note).toBe('A');
    expect(rootCell.isRoot).toBe(true);
    expect(rootCell.active).toBe(true);
    expect(rootCell.interval).toBe('R');

    // High-E string, fret 1 → F, which is NOT in A pentatonic minor.
    const offScale = board[0][1];
    expect(offScale.note).toBe('F');
    expect(offScale.active).toBe(false);
    expect(offScale.isRoot).toBe(false);
  });

  it('marks chord tones active in chord mode', () => {
    const board = annotateBoard('A', getChordNotes('A', 'minor')); // A C E
    const cMinorThird = board[0][8]; // high-E fret 8 → C
    expect(cMinorThird.note).toBe('C');
    expect(cMinorThird.active).toBe(true);
    expect(cMinorThird.interval).toBe('b3');
  });
});

describe('normalizeKey', () => {
  it('accepts sharps, flats, and lowercase', () => {
    expect(normalizeKey('C')).toBe('C');
    expect(normalizeKey('c#')).toBe('C#');
    expect(normalizeKey('Db')).toBe('C#');
    expect(normalizeKey('Bb')).toBe('A#');
  });

  it('rejects nonsense', () => {
    expect(normalizeKey('H')).toBeNull();
    expect(normalizeKey('')).toBeNull();
  });
});

describe('URL state round-trip', () => {
  it('serializes scale mode and parses it back', () => {
    const state: FretState = { ...DEFAULT, key: 'C', mode: 'scale', scaleKey: 'major' };
    const search = stateToSearch(state);
    expect(search).toContain('key=C');
    expect(search).toContain('mode=scale');
    expect(search).toContain('scale=major');
    expect(parseStateFromSearch(search, DEFAULT)).toEqual(state);
  });

  it('omits the scale param in chord mode and parses chord back', () => {
    const search = stateToSearch({
      ...DEFAULT,
      key: 'D',
      mode: 'chord',
      chordKey: 'minor7',
    });
    expect(search).toContain('chord=minor7');
    expect(search).not.toContain('scale=');
    const parsed = parseStateFromSearch(search, DEFAULT);
    expect(parsed.mode).toBe('chord');
    expect(parsed.chordKey).toBe('minor7');
  });

  it('round-trips the CAGED shape and board style', () => {
    const search = stateToSearch({ ...DEFAULT, caged: 'E', style: 'studio' });
    expect(search).toContain('caged=E');
    expect(search).toContain('style=studio');
    const parsed = parseStateFromSearch(search, DEFAULT);
    expect(parsed.caged).toBe('E');
    expect(parsed.style).toBe('studio');
  });

  it('leaves the defaults out of the query string', () => {
    const search = stateToSearch(DEFAULT);
    expect(search).not.toContain('caged=');
    expect(search).not.toContain('style=');
  });

  it('falls back on invalid params', () => {
    const parsed = parseStateFromSearch('?key=H&mode=bogus&scale=nope&caged=X&style=neon', DEFAULT);
    expect(parsed).toEqual(DEFAULT);
  });

  it('builds a shareable path for whichever surface asked for it', () => {
    expect(shareLink({ ...DEFAULT, key: 'C', scaleKey: 'major' })).toBe(
      '/dashboard/fretboard?key=C&mode=scale&scale=major'
    );
    // The free public page must hand out links back to itself, not to a page
    // behind the login wall.
    expect(shareLink({ ...DEFAULT, key: 'C', scaleKey: 'major' }, FRETBOARD_PATHS.public)).toBe(
      '/fretboard?key=C&mode=scale&scale=major'
    );
  });
});
