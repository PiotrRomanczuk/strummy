import { getNoteAtFret, STANDARD_TUNING, TOTAL_FRETS, type NoteName } from './notes';

/**
 * CAGED system: the five movable chord shapes that tile the neck.
 *
 * Each shape is anchored by the root note on one string, and covers a span of
 * frets relative to that root. String indices here follow `STANDARD_TUNING`
 * (0 = low E / 6th string … 5 = high e / 1st string).
 */
export type CagedShape = 'C' | 'A' | 'G' | 'E' | 'D';

export const CAGED_ORDER: readonly CagedShape[] = ['C', 'A', 'G', 'E', 'D'] as const;

export interface CagedShapeDefinition {
  /** Index into STANDARD_TUNING of the string carrying the shape's root. */
  anchorString: number;
  /** Fret span relative to the anchor root, `[before, after]`. */
  span: readonly [number, number];
}

export const CAGED_SHAPES: Record<CagedShape, CagedShapeDefinition> = {
  C: { anchorString: 1, span: [-3, 1] },
  A: { anchorString: 1, span: [0, 3] },
  G: { anchorString: 0, span: [-3, 2] },
  E: { anchorString: 0, span: [0, 3] },
  D: { anchorString: 2, span: [0, 3] },
};

export interface CagedPosition {
  shape: CagedShape;
  startFret: number;
  endFret: number;
  rootFret: number;
}

/**
 * Lowest fret at or above `minFret` where `note` sounds on `stringIdx`
 * (0 = low E). Returns -1 when the note is out of range.
 */
export function findNoteOnString(
  stringIdx: number,
  note: NoteName,
  minFret = 0,
  totalFrets: number = TOTAL_FRETS
): number {
  const open = STANDARD_TUNING[stringIdx];
  if (!open) return -1;
  for (let fret = minFret; fret <= totalFrets; fret++) {
    if (getNoteAtFret(open, fret) === note) return fret;
  }
  return -1;
}

/**
 * The CAGED positions available for `root` on a `totalFrets`-fret neck,
 * ordered from the nut upwards.
 *
 * A shape whose span would start below the nut is pushed up an octave rather
 * than clamped to fret 0 — clamping produced two-fret stubs that no longer
 * describe a playable shape (e.g. the C-shape of A at the open position).
 */
export function getActiveCAGEDShapes(
  root: NoteName,
  totalFrets: number = TOTAL_FRETS
): CagedPosition[] {
  const positions: CagedPosition[] = [];

  for (const shape of CAGED_ORDER) {
    const { anchorString, span } = CAGED_SHAPES[shape];
    const firstRoot = findNoteOnString(anchorString, root, 0, totalFrets);
    if (firstRoot < 0) continue;

    const rootFret = firstRoot + span[0] < 0 ? firstRoot + 12 : firstRoot;
    const startFret = rootFret + span[0];
    const endFret = rootFret + span[1];
    if (startFret < 0 || endFret > totalFrets) continue;

    positions.push({ shape, startFret, endFret, rootFret });
  }

  return positions.sort((a, b) => a.startFret - b.startFret);
}
