/** Geometry of the small chord box on the song page: six strings, four frets. */

export const STRINGS = 6;
export const FRETS = 4;

export type ChordGridBox = {
  size: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export const boxFor = (size: number): ChordGridBox => {
  const left = size * 0.18;
  const top = size * 0.28;
  return {
    size,
    left,
    top,
    width: size - left - size * 0.12,
    height: size * 1.28 - top - size * 0.14,
  };
};

/** The x of string `i`, low E (0) on the left. */
export const stringX = (box: ChordGridBox, i: number) => box.left + (box.width * i) / (STRINGS - 1);

/** The y of the middle of fret row `row` (1 = the first visible fret). */
export const rowY = (box: ChordGridBox, row: number) =>
  box.top + (box.height * (row - 0.5)) / FRETS;
