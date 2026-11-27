/**
 * Playing techniques of a song (#1206): which ones a song really uses, and how much. Pure rules over the stored
 * counts (`song_techniques`): per technique a number of marks, plus the song's total note count.
 */

/** Techniques shown as chips and offered in the filter, in the order the filter lists them. */
export const MAIN_TECHNIQUES = [
  'hammer_pull',
  'slide',
  'bend',
  'vibrato',
  'let_ring',
  'dead_note',
  'palm_mute',
  'harmonic',
  'tapping',
  'tuplet',
] as const;

export type TechniqueKey = (typeof MAIN_TECHNIQUES)[number];

/** Every key the loader accepts; the rest (minor ones, strokes) is stored but never shown. */
export const STORED_TECHNIQUE_KEYS = [
  ...MAIN_TECHNIQUES,
  'grace',
  'ghost',
  'tremolo_picking',
  'trill',
  'whammy',
  'staccato',
  'stroke_down',
  'stroke_up',
] as const;

export type Strength = 'little' | 'regular' | 'lot';

export interface SongTechnique {
  key: TechniqueKey;
  count: number;
  /** Marks per note of the song (0..1). */
  share: number;
  strength: Strength;
}

/** A song has a technique at this many marks and this share of its notes … */
export const MIN_MARKS = 8;
export const MIN_SHARE = 0.01;
/** … or at this many marks regardless of share (long songs). */
export const MARKS_ALWAYS = 25;

const REGULAR_SHARE = 0.03;
const LOT_SHARE = 0.1;

export const isMainTechnique = (key: string): key is TechniqueKey =>
  (MAIN_TECHNIQUES as readonly string[]).includes(key);

export function hasTechnique(count: number, noteCount: number): boolean {
  if (!(noteCount > 0) || !(count > 0)) return false;
  return (count >= MIN_MARKS && count / noteCount >= MIN_SHARE) || count >= MARKS_ALWAYS;
}

export function strengthOf(share: number): Strength {
  if (share >= LOT_SHARE) return 'lot';
  if (share >= REGULAR_SHARE) return 'regular';
  return 'little';
}

/** The techniques a song has, densest first (ties by catalogue order). */
export function songTechniques(
  techniques: Record<string, unknown>,
  noteCount: number
): SongTechnique[] {
  const found: SongTechnique[] = [];
  for (const key of MAIN_TECHNIQUES) {
    const count = techniques[key];
    if (typeof count !== 'number' || !hasTechnique(count, noteCount)) continue;
    const share = count / noteCount;
    found.push({ key, count, share, strength: strengthOf(share) });
  }
  return found.sort((a, b) => b.share - a.share);
}
