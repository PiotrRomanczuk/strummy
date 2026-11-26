import type { BassNote, SongPart } from '@/schemas/SongSegmentsSchema';

/**
 * Pure helpers of the song map card (SNG-16): what a part of a song2logic analysis is called, the loop it is
 * built from, and its drum and bass patterns as cells of a sixteenth grid.
 */

export const PART_KINDS = [
  'intro',
  'verse',
  'chorus',
  'bridge',
  'solo',
  'inst',
  'break',
  'outro',
] as const;
export type PartKind = (typeof PART_KINDS)[number];

/** The bass riff is shown with its notes only when an average bar of the part plays this much of it. */
export const RIFF_SHARE_TO_NAME = 0.6;
const SLOTS_PER_BEAT = 4;

export function partKind(name: string | null): PartKind | null {
  return PART_KINDS.find((kind) => kind === name) ?? null;
}

/**
 * A colour slot (0-based) per part, stable for the song: by kind when the parts have names, else by their
 * letter in order of first appearance — so a repeated part always wears the same colour.
 */
export function partColours(parts: Pick<SongPart, 'name' | 'label'>[], slots: number): number[] {
  const seen: string[] = [];
  return parts.map((part) => {
    const kind = partKind(part.name);
    if (kind) return PART_KINDS.indexOf(kind) % slots;
    if (!seen.includes(part.label)) seen.push(part.label);
    return seen.indexOf(part.label) % slots;
  });
}

export interface PartLoop {
  /** One entry per bar of the loop. */
  chords: string[];
  roman: string[];
  /** How many times the loop fits in the part. */
  times: number;
}

/** The loop the part is built from, with the chords of its first full run; null when the part does not loop. */
export function partLoop(part: Pick<SongPart, 'chords' | 'roman' | 'loop'>): PartLoop | null {
  const size = part.loop.length;
  if (size === 0 || size * 2 > part.roman.length) return null;
  const starts = part.roman.map((_, i) => i).filter((i) => i + size <= part.roman.length);
  const start = starts.find((i) => part.loop.every((degree, k) => part.roman[i + k] === degree));
  if (start === undefined) return null;
  return {
    chords: part.chords.slice(start, start + size),
    roman: part.loop,
    times: Math.floor(part.roman.length / size),
  };
}

export interface LaneCell {
  /** Sixteenths the cell covers. */
  span: number;
  level: 'on' | 'half' | 'off';
  text: string;
  /** The cell starts a beat. */
  isBeat: boolean;
}

const cell = (slot: number, level: LaneCell['level'], span = 1, text = ''): LaneCell => ({
  span,
  level,
  text,
  isBeat: slot % SLOTS_PER_BEAT === 0,
});

/** A song2logic pattern ("X.x.…") as one cell per sixteenth. */
export function patternCells(pattern: string): LaneCell[] {
  return [...pattern].map((mark, slot) =>
    cell(slot, mark === 'X' ? 'on' : mark === 'x' ? 'half' : 'off')
  );
}

/** The riff as cells: a note covers its length up to the next note or the bar's end; `withNames` writes it. */
export function riffCells(riff: BassNote[], slots: number, withNames: boolean): LaneCell[] {
  const notes = [...riff].filter((note) => note.slot < slots).sort((a, b) => a.slot - b.slot);
  const cells: LaneCell[] = [];
  let slot = 0;
  for (const [i, note] of notes.entries()) {
    if (note.slot < slot) continue;
    while (slot < note.slot) cells.push(cell(slot++, 'off'));
    const limit = (notes[i + 1]?.slot ?? slots) - slot;
    const span = Math.max(1, Math.min(note.sixteenths, limit));
    cells.push(cell(slot, 'on', span, withNames ? note.note : ''));
    slot += span;
  }
  while (slot < slots) cells.push(cell(slot++, 'off'));
  return cells;
}

/** "F# minor" → its tonic and whether it is minor. */
export function splitKey(songKey: string): { tonic: string; isMinor: boolean } {
  const [tonic = songKey, scale = ''] = songKey.trim().split(/\s+/);
  return { tonic, isMinor: scale.toLowerCase() === 'minor' };
}
