import { NO_CHORD, type SongCard } from './song-card';

/**
 * Where a moment of the recording falls on the song card (SNG-17), and what the guitar does there. Pure: the
 * player, the backing track and a click on a bar all move one clock in seconds; these turn it into bars.
 */

export const SLOTS_PER_BAR = 16;

export interface CardPosition {
  /** 0-based bar; 0 also before the first downbeat. */
  bar: number;
  /** The sixteenth of the bar, -1 before the first downbeat. */
  slot: number;
  half: 0 | 1;
  /** 0-based part, -1 when the card has no parts. */
  part: number;
}

/** Index of the last item starting at or before `t` (0 when none does). */
function lastStartedAt(starts: { start: number }[], t: number): number {
  let found = 0;
  for (let i = 0; i < starts.length && starts[i].start <= t; i++) found = i;
  return found;
}

export function cardPosition(card: SongCard, t: number): CardPosition {
  const part = card.parts.length ? lastStartedAt(card.parts, t) : -1;
  if (card.bars.length === 0) return { bar: 0, slot: -1, half: 0, part };
  const bar = lastStartedAt(card.bars, t);
  const { start, end } = card.bars[bar];
  if (t < start) return { bar, slot: -1, half: 0, part };
  const slot = Math.min(
    SLOTS_PER_BAR - 1,
    Math.floor(((t - start) / (end - start)) * SLOTS_PER_BAR)
  );
  return { bar, slot, half: slot < SLOTS_PER_BAR / 2 ? 0 : 1, part };
}

/** The chord of a bar half; `edits` are the teacher's corrections, a whole bar each. */
export function chordAt(
  card: SongCard,
  bar: number,
  half: 0 | 1,
  edits: Readonly<Record<number, string>> = {}
): string {
  return edits[bar] ?? card.bars[bar]?.halves[half] ?? NO_CHORD;
}

export interface NextChord {
  chord: string;
  /** Bars from the current one: 0 = later in this bar. */
  inBars: number;
}

/** The next chord change after a bar half, skipping "no chord". */
export function nextChord(
  card: SongCard,
  bar: number,
  half: 0 | 1,
  edits: Readonly<Record<number, string>> = {}
): NextChord | null {
  const current = chordAt(card, bar, half, edits);
  for (let b = bar; b < card.bars.length; b++) {
    for (let h = b === bar ? half + 1 : 0; h < 2; h++) {
      const chord = chordAt(card, b, h as 0 | 1, edits);
      if (chord !== current && chord !== NO_CHORD) return { chord, inBars: b - bar };
    }
  }
  return null;
}

/** The chords a run of bars uses, in order of first use, without "no chord". */
export function chordsOfBars(
  card: SongCard,
  from: number,
  to: number,
  edits: Readonly<Record<number, string>> = {}
): string[] {
  const used: string[] = [];
  for (let b = from; b < to; b++) {
    for (const half of [0, 1] as const) {
      const chord = chordAt(card, b, half, edits);
      if (chord !== NO_CHORD && !used.includes(chord)) used.push(chord);
    }
  }
  return used;
}

export type StrumMark = 'down' | 'up' | 'mute' | null;

/**
 * Directions for song2logic's strum pattern. The analysis hears where the hand hits, not which way it moves, so
 * the default is the pendulum rule: down on the eighths, up on the sixteenths between them.
 */
export function strumFromRule(pattern: string): StrumMark[] {
  return [...pattern].map((mark, slot) => (mark === '.' ? null : slot % 2 === 0 ? 'down' : 'up'));
}
