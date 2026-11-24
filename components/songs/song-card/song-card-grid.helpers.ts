import { NO_CHORD, type SongCard } from '@/lib/music-theory/song-card';
import { chordAt, SLOTS_PER_BAR, type StrumMark } from '@/lib/music-theory/song-card-clock';
import { riffCells } from '@/lib/music-theory/song-map';
import type { BassNote } from '@/schemas/SongSegmentsSchema';

/** One cell of the card's sixteenth grid: what it shows and how many sixteenths it covers. */
export type GridTone =
  'count' | 'chord' | 'down' | 'up' | 'mute' | 'hit' | 'ghost' | 'note' | 'empty';

export interface GridCell {
  /** The sixteenth it starts on. */
  slot: number;
  span: number;
  tone: GridTone;
  text: string;
  /** A weak hit in the recording (song2logic "x"). */
  isWeak?: boolean;
}

export const COUNT = '1 e i a 2 e i a 3 e i a 4 e i a'.split(' ');

const single = (slot: number, tone: GridTone, text = '', isWeak = false): GridCell => ({
  slot,
  span: 1,
  tone,
  text,
  isWeak,
});

export const countCells = (): GridCell[] =>
  COUNT.map((count, slot) => single(slot, 'count', count));

/** The bar's chord at its first sixteenth, and again in the middle when the second half changes it. */
export function chordCells(
  card: SongCard,
  bar: number,
  edits: Readonly<Record<number, string>> = {}
): GridCell[] {
  const first = chordAt(card, bar, 0, edits);
  const second = chordAt(card, bar, 1, edits);
  return COUNT.map((_, slot) => {
    if (slot === 0 && first !== NO_CHORD) return single(slot, 'chord', first);
    if (slot === SLOTS_PER_BAR / 2 && second !== first && second !== NO_CHORD) {
      return single(slot, 'chord', second);
    }
    return single(slot, 'empty');
  });
}

const STRUM_TONE: Record<NonNullable<StrumMark>, GridTone> = {
  down: 'down',
  up: 'up',
  mute: 'mute',
};
const STRUM_TEXT: Record<NonNullable<StrumMark>, string> = { down: '↓', up: '↑', mute: '×' };

/** The strum marks; `pattern` tells which of them the recording plays weakly. */
export function strumCells(marks: StrumMark[], pattern: string): GridCell[] {
  return COUNT.map((_, slot) => {
    const mark = marks[slot] ?? null;
    if (!mark) return single(slot, 'empty');
    return single(slot, STRUM_TONE[mark], STRUM_TEXT[mark], pattern[slot] === 'x');
  });
}

/** A drum pattern: "X" a hit, "x" a ghost (heard in a quarter of the part's bars). */
export function hitCells(pattern: string): GridCell[] {
  return COUNT.map((_, slot) => {
    const mark = pattern[slot];
    if (mark === 'X') return single(slot, 'hit', '●');
    if (mark === 'x') return single(slot, 'ghost', '•');
    return single(slot, 'empty');
  });
}

/** The bass of one bar: each note covers its length (up to the next note), with its name without the octave. */
export function bassCells(notes: BassNote[]): GridCell[] {
  let slot = 0;
  return riffCells(notes, SLOTS_PER_BAR, true).map((cell) => {
    const start = slot;
    slot += cell.span;
    return cell.level === 'off'
      ? single(start, 'empty')
      : { slot: start, span: cell.span, tone: 'note', text: cell.text.replace(/-?\d+$/, '') };
  });
}

/** Whether a cell covers the playing sixteenth. */
export const coversSlot = (cell: GridCell, slot: number): boolean =>
  slot >= cell.slot && slot < cell.slot + cell.span;

/** A row read out for screen readers: "1: G, 9: C". */
export const describeCells = (cells: GridCell[]): string =>
  cells
    .filter((cell) => cell.tone !== 'empty')
    .map((cell) => `${cell.slot + 1}: ${cell.text}`)
    .join(', ');
