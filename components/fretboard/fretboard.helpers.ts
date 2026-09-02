import {
  CAGED_ORDER,
  CHROMATIC_NOTES,
  getIntervalName,
  getNoteAtFret,
  getSemitoneDistance,
  formatNote,
  SCALE_DEFINITIONS,
  CHORD_DEFINITIONS,
  type CagedShape,
  type NoteName,
} from '@/lib/music-theory';

import {
  BOARD_GEOMETRY,
  DISPLAY_STRINGS,
  FRETBOARD_STYLES,
  LAST_FRET,
  type FretboardStyle,
} from './fretboard.constants';

/** Columns drawn on the board: the open string plus frets 1…LAST_FRET. */
export const FRET_COLUMNS = LAST_FRET + 1;

export type FretMode = 'scale' | 'chord' | 'off';

/** A single position on the board, in display coordinates (row 0 = high e). */
export interface BoardCell {
  row: number;
  fret: number;
}

export interface BoardGeometry {
  padLeft: number;
  padTop: number;
  boardWidth: number;
  boardHeight: number;
  fretWidth: number;
  /** Vertical center of a string, top (high e) to bottom (low E). */
  stringY: (row: number) => number;
  /** Horizontal center of a fret column (0 = open strings). */
  fretX: (fret: number) => number;
  /** Left edge of a fret column — where its wire is drawn. */
  fretWireX: (fret: number) => number;
}

/** Resolve the SVG layout for a given board size. */
export function boardGeometry(width: number, height: number): BoardGeometry {
  const { padTop, padBottom, padLeft, padRight, labelWidth } = BOARD_GEOMETRY;
  const left = padLeft + labelWidth;
  const boardWidth = width - left - padRight;
  const boardHeight = height - padTop - padBottom;
  const fretWidth = boardWidth / FRET_COLUMNS;
  return {
    padLeft: left,
    padTop,
    boardWidth,
    boardHeight,
    fretWidth,
    stringY: (row) => padTop + (boardHeight * row) / (DISPLAY_STRINGS.length - 1),
    fretX: (fret) => left + (fret + 0.5) * fretWidth,
    fretWireX: (fret) => left + fret * fretWidth,
  };
}

/** CAGED overlay selection: a single shape, every shape, or none. */
export type CagedSelection = CagedShape | 'none' | 'all';

export interface FretState {
  key: NoteName;
  mode: FretMode;
  scaleKey: string;
  chordKey: string;
  caged: CagedSelection;
  style: FretboardStyle;
}

export interface AnnotatedCell {
  note: NoteName;
  active: boolean;
  isRoot: boolean;
  /** R, b3, 5, … relative to the root. */
  interval: string;
}

/**
 * Annotate the drawn board — 6 strings (high e first) × frets 0…LAST_FRET —
 * with each cell's note, scale/chord membership, root flag and interval.
 */
export function annotateBoard(root: NoteName, activeNotes: NoteName[]): AnnotatedCell[][] {
  const activeSet = new Set(activeNotes);
  return DISPLAY_STRINGS.map((open) => {
    const cells: AnnotatedCell[] = [];
    for (let fret = 0; fret <= LAST_FRET; fret++) {
      const note = getNoteAtFret(open, fret);
      cells.push({
        note,
        active: activeSet.has(note),
        isRoot: note === root,
        interval: getIntervalName(getSemitoneDistance(root, note)),
      });
    }
    return cells;
  });
}

/** The label shown on a marker: interval name or (enharmonic) note name. */
export function cellLabel(cell: AnnotatedCell, showIntervals: boolean, useFlats: boolean): string {
  return showIntervals ? cell.interval : formatNote(cell.note, useFlats);
}

/** Screen-reader label for a cell: note name, root flag, string and fret. */
export function cellAriaLabel(
  cell: AnnotatedCell,
  isRootCell: boolean,
  row: number,
  fret: number,
  useFlats: boolean
): string {
  const rootSuffix = isRootCell ? ', root note' : '';
  const position = fret === 0 ? 'open' : `fret ${fret}`;
  return `${formatNote(cell.note, useFlats)}${rootSuffix}, string ${row + 1} ${position}`;
}

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/** Normalize a raw key string (sharp or flat) to a canonical chromatic note. */
export function normalizeKey(raw: string): NoteName | null {
  const cleaned = raw.charAt(0).toUpperCase() + raw.slice(1);
  const sharp = FLAT_TO_SHARP[cleaned] ?? cleaned;
  return (CHROMATIC_NOTES as readonly string[]).includes(sharp) ? (sharp as NoteName) : null;
}

function parseCaged(raw: string | null, fallback: CagedSelection): CagedSelection {
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  if (raw === 'none' || raw === 'all') return raw;
  return (CAGED_ORDER as readonly string[]).includes(upper) ? (upper as CagedShape) : fallback;
}

function parseStyle(raw: string | null, fallback: FretboardStyle): FretboardStyle {
  const match = FRETBOARD_STYLES.find((s) => s.value === raw);
  return match ? match.value : fallback;
}

/** Parse fretboard state from a URL query string, falling back per-field. */
export function parseStateFromSearch(search: string, fallback: FretState): FretState {
  const params = new URLSearchParams(search);
  const rawKey = params.get('key');
  const rawMode = params.get('mode');
  const scaleParam = params.get('scale');
  const chordParam = params.get('chord');
  return {
    key: (rawKey && normalizeKey(rawKey)) || fallback.key,
    mode: rawMode === 'chord' || rawMode === 'off' || rawMode === 'scale' ? rawMode : fallback.mode,
    scaleKey: scaleParam && SCALE_DEFINITIONS[scaleParam] ? scaleParam : fallback.scaleKey,
    chordKey: chordParam && CHORD_DEFINITIONS[chordParam] ? chordParam : fallback.chordKey,
    caged: parseCaged(params.get('caged'), fallback.caged),
    style: parseStyle(params.get('style'), fallback.style),
  };
}

/** Serialize fretboard state to a URL query string (e.g. `?key=A&mode=scale…`). */
export function stateToSearch(state: FretState): string {
  const params = new URLSearchParams();
  params.set('key', state.key);
  params.set('mode', state.mode);
  if (state.mode === 'scale') params.set('scale', state.scaleKey);
  if (state.mode === 'chord') params.set('chord', state.chordKey);
  if (state.caged !== 'none') params.set('caged', state.caged);
  if (state.style !== 'engraved') params.set('style', state.style);
  return `?${params.toString()}`;
}

/** The path + query shown in (and copied from) the "Shareable link" card. */
export function shareLink(state: FretState): string {
  return `/dashboard/fretboard${stateToSearch(state)}`;
}
