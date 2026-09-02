import { createTranslator } from 'next-intl';

import { getScaleNotes } from '@/lib/music-theory';
import enMessages from '@/messages/en.json';

import {
  boardGeometry,
  cellAriaLabel,
  cellLabel,
  deriveMarkerState,
} from './fretboard-board.helpers';
import { annotateBoard, FRET_COLUMNS } from './fretboard.helpers';

// The real English translator, so the aria-label assertions below check the
// shipped message strings rather than a stub.
const t = createTranslator({ locale: 'en', messages: enMessages, namespace: 'Fretboard' });

describe('cellLabel', () => {
  const board = annotateBoard('A', getScaleNotes('A', 'pentatonic_minor'));

  it('shows the note name by default and the interval when requested', () => {
    const root = board[0][5];
    expect(cellLabel(root, false, false)).toBe('A');
    expect(cellLabel(root, true, false)).toBe('R');
  });

  it('renders enharmonic flats when useFlats is on', () => {
    const cSharp = annotateBoard('A', [])[0][9]; // high-E fret 9 → C#
    expect(cSharp.note).toBe('C#');
    expect(cellLabel(cSharp, false, true)).toBe('Db');
  });
});

describe('cellAriaLabel', () => {
  const board = annotateBoard('A', getScaleNotes('A', 'pentatonic_minor'));

  it('names the string and fret, and calls fret 0 open', () => {
    expect(cellAriaLabel(t, board[0][5], true, 0, 5, false)).toBe('A, root note, string 1 fret 5');
    expect(cellAriaLabel(t, board[0][0], false, 0, 0, false)).toBe('E, string 1 open');
    expect(cellAriaLabel(t, board[0][1], false, 0, 1, false)).toBe('F, string 1 fret 1');
    expect(cellAriaLabel(t, board[4][0], true, 4, 0, false)).toBe('A, root note, string 5 open');
  });
});

describe('boardGeometry', () => {
  it('lays 16 evenly spaced columns and 6 strings inside the padding', () => {
    const geometry = boardGeometry(1000, 240);
    expect(geometry.boardWidth).toBeCloseTo(1000 - (14 + 24) - 14);
    expect(geometry.fretWidth).toBeCloseTo(geometry.boardWidth / FRET_COLUMNS);
    // Fret centers advance by exactly one column width.
    expect(geometry.fretX(1) - geometry.fretX(0)).toBeCloseTo(geometry.fretWidth);
    // Wires sit on column edges, half a column left of the center.
    expect(geometry.fretX(3) - geometry.fretWireX(3)).toBeCloseTo(geometry.fretWidth / 2);
    // The six strings span the full board height.
    expect(geometry.stringY(0)).toBeCloseTo(geometry.padTop);
    expect(geometry.stringY(5)).toBeCloseTo(geometry.padTop + geometry.boardHeight);
  });
});

describe('deriveMarkerState', () => {
  const geometry = boardGeometry(1000, 240);
  const board = annotateBoard('A', getScaleNotes('A', 'pentatonic_minor'));

  const baseInput = {
    geometry,
    mode: 'scale' as const,
    hideNonScale: false,
    highlightRoot: true,
    playingCell: null,
    selectedCell: null,
  };

  it('marks the root gold and an ordinary scale tone active', () => {
    const root = deriveMarkerState({ ...baseInput, cell: board[0][5], row: 0, fret: 5 });
    expect(root.variant).toBe('root');
    expect(root.isRootCell).toBe(true);

    const active = deriveMarkerState({ ...baseInput, cell: board[0][3], row: 0, fret: 3 }); // G
    expect(active.variant).toBe('active');
  });

  it('marks an off-scale tone dim, or hidden when the toggle asks for it', () => {
    const offScale = board[0][1]; // F, not in A pentatonic minor
    const dim = deriveMarkerState({ ...baseInput, cell: offScale, row: 0, fret: 1 });
    expect(dim.variant).toBe('dim');
    expect(dim.hidden).toBe(false);

    const hidden = deriveMarkerState({
      ...baseInput,
      cell: offScale,
      row: 0,
      fret: 1,
      hideNonScale: true,
    });
    expect(hidden.variant).toBe('hidden');
    expect(hidden.hidden).toBe(true);
  });

  it('demotes the root to an ordinary active tone when highlightRoot is off', () => {
    const demoted = deriveMarkerState({
      ...baseInput,
      cell: board[0][5],
      row: 0,
      fret: 5,
      highlightRoot: false,
    });
    expect(demoted.variant).toBe('active');
    expect(demoted.isRootCell).toBe(false);
  });

  it('labels every note as chromatic in Off mode, root included', () => {
    const chromaticOffScale = deriveMarkerState({
      ...baseInput,
      mode: 'off',
      cell: board[0][1],
      row: 0,
      fret: 1,
    });
    expect(chromaticOffScale.variant).toBe('chromatic');
    expect(chromaticOffScale.labelled).toBe(true);

    const chromaticRoot = deriveMarkerState({
      ...baseInput,
      mode: 'off',
      cell: board[0][5],
      row: 0,
      fret: 5,
    });
    expect(chromaticRoot.variant).toBe('root');
  });

  it('flags playing and selected cells independently of variant', () => {
    const state = deriveMarkerState({
      ...baseInput,
      cell: board[0][3],
      row: 0,
      fret: 3,
      playingCell: { row: 0, fret: 3 },
      selectedCell: { row: 1, fret: 2 },
    });
    expect(state.isPlaying).toBe(true);
    expect(state.isSelected).toBe(false);
  });

  it('places the marker at the geometry-resolved center of its cell', () => {
    const state = deriveMarkerState({ ...baseInput, cell: board[2][7], row: 2, fret: 7 });
    expect(state.cx).toBeCloseTo(geometry.fretX(7));
    expect(state.cy).toBeCloseTo(geometry.stringY(2));
  });
});
