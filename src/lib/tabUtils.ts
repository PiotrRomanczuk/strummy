import type { ChordVoicing, TabColumn, TabLength } from "./types";

// "Empty" pattern of N columns: 6 strings × N nulls each.
export function emptyTabPattern(length: TabLength): TabColumn[] {
  return Array.from({ length }, () => Array.from({ length: 6 }, () => null));
}

export function isEmptyTabPattern(p: TabColumn[] | undefined): boolean {
  if (!p) return true;
  return p.every((col) => col.every((v) => v === null));
}

// Resize a TAB pattern to a new column count. Preserves overlapping columns;
// fills the difference with empties on either end.
export function resizeTabPattern(p: TabColumn[], length: TabLength): TabColumn[] {
  if (p.length === length) return p;
  if (p.length > length) return p.slice(0, length);
  const extra = Array.from({ length: length - p.length }, () => Array.from({ length: 6 }, () => null));
  return [...p, ...extra];
}

// Seed a TAB from a chord voicing: spread the chord's picked strings across
// 8 columns, low-to-high, one string per column, like a basic Travis pick.
// `voicing.frets` is in low-E…high-e order; we play E, then A, then alternate
// G/D/B/e to mimic alternating bass + treble.
export function tabFromVoicing(voicing: ChordVoicing): TabColumn[] {
  const cols = emptyTabPattern(8);
  const picked = voicing.frets
    .map((f, i) => ({ f, i }))
    .filter((s) => s.f >= 0);
  if (picked.length === 0) return cols;

  // Travis-style: bass on 1/3/5/7, treble on 2/4/6/8. Use the lowest two
  // sounded strings as the bass alternation, and the top three as treble.
  const bass = picked.slice(0, Math.min(2, picked.length));
  const treble = picked.slice(bass.length);

  const place = (col: number, s: { f: number; i: number }) => {
    cols[col][s.i] = s.f;
  };

  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0 && bass.length > 0) {
      place(i, bass[(i / 2) % bass.length]);
    } else if (treble.length > 0) {
      place(i, treble[(Math.floor(i / 2)) % treble.length]);
    }
  }
  return cols;
}

// Set the cell at (col, string) to `value`, returning a new pattern. Returns
// undefined if the result is fully empty so the marker can drop the field.
export function setTabCell(
  pattern: TabColumn[], col: number, stringIdx: number, value: number | null,
): TabColumn[] | undefined {
  const next = pattern.map((c) => [...c] as TabColumn);
  next[col][stringIdx] = value;
  return isEmptyTabPattern(next) ? undefined : next;
}
