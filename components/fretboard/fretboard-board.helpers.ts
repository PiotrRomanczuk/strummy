import { formatNote } from '@/lib/music-theory';

import { BOARD_GEOMETRY, DISPLAY_STRINGS } from './fretboard.constants';
import {
  FRET_COLUMNS,
  type AnnotatedCell,
  type BoardCell,
  type FretMode,
} from './fretboard.helpers';
import type { Translate } from './fretboard.i18n';

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

/** The label shown on a marker: interval name or (enharmonic) note name. */
export function cellLabel(cell: AnnotatedCell, showIntervals: boolean, useFlats: boolean): string {
  return showIntervals ? cell.interval : formatNote(cell.note, useFlats);
}

/**
 * Screen-reader label for a cell: note name, root flag, string and fret.
 *
 * Four message variants rather than concatenation — "open" is not a fret
 * number, and word order for the root differs by language.
 */
export function cellAriaLabel(
  t: Translate,
  cell: AnnotatedCell,
  isRootCell: boolean,
  row: number,
  fret: number,
  useFlats: boolean
): string {
  const key = isRootCell
    ? fret === 0
      ? 'board.cellAriaRootOpen'
      : 'board.cellAriaRoot'
    : fret === 0
      ? 'board.cellAriaOpen'
      : 'board.cellAria';
  return t(key, { note: formatNote(cell.note, useFlats), string: row + 1, fret });
}

/** How a position is drawn, in one word. */
export type MarkerVariant = 'hidden' | 'root' | 'active' | 'chromatic' | 'dim';

export interface DerivedMarkerState {
  hidden: boolean;
  labelled: boolean;
  isRootCell: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  variant: MarkerVariant;
  cx: number;
  cy: number;
}

export interface MarkerStateInput {
  cell: AnnotatedCell;
  row: number;
  fret: number;
  geometry: BoardGeometry;
  mode: FretMode;
  hideNonScale: boolean;
  highlightRoot: boolean;
  playingCell: BoardCell | null;
  selectedCell: BoardCell | null;
}

/**
 * Everything about a board position that is computed rather than passed
 * straight through — pulled out of the marker component so its
 * 96-times-per-board render body stays short. `variant` is what tests assert
 * on rather than fill colours: root (gold), active (named scale/chord tone),
 * chromatic (named but outside the overlay, i.e. Off mode), dim (a quiet
 * dot), hidden.
 */
export function deriveMarkerState({
  cell,
  row,
  fret,
  geometry,
  mode,
  hideNonScale,
  highlightRoot,
  playingCell,
  selectedCell,
}: MarkerStateInput): DerivedMarkerState {
  const hidden = hideNonScale && mode !== 'off' && !cell.active;
  const labelled = cell.active || mode === 'off';
  const isRootCell = cell.isRoot && highlightRoot && labelled;

  return {
    hidden,
    labelled,
    isRootCell,
    isPlaying: playingCell?.row === row && playingCell?.fret === fret,
    isSelected: selectedCell?.row === row && selectedCell?.fret === fret,
    variant: hidden
      ? 'hidden'
      : isRootCell
        ? 'root'
        : cell.active
          ? 'active'
          : labelled
            ? 'chromatic'
            : 'dim',
    cx: geometry.fretX(fret),
    cy: geometry.stringY(row),
  };
}
