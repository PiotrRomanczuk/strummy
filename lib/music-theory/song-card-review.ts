import type { CardPart, SongCard } from './song-card';
import { strumFromRule, type StrumMark } from './song-card-clock';

/**
 * The teacher's review of a song card (SNG-17), pure part. Chords of the analysis are approved per group of parts
 * (one kind built on one loop — every chorus at once), a bar's chord can be replaced, and the strum is corrected
 * per group: the analysis hears where the hand hits, not which way it moves.
 */
export interface CardReview {
  approvedGroups: string[];
  /** Per group, 16 marks: d down, u up, m muted, . rest. */
  strums: Record<string, string>;
  /** Per bar (0-based), the teacher's chord for the whole bar. */
  chordEdits: Record<number, string>;
}

export const EMPTY_REVIEW: CardReview = { approvedGroups: [], strums: {}, chordEdits: {} };

export type ReviewPatch =
  | { kind: 'approve'; group: string; isApproved: boolean }
  | { kind: 'strum'; group: string; code: string | null }
  | { kind: 'chord'; bar: number; chord: string | null };

const CODE: Record<string, StrumMark> = { d: 'down', u: 'up', m: 'mute', '.': null };
const MARK_CODE = { down: 'd', up: 'u', mute: 'm' } as const;
const CYCLE: StrumMark[] = ['down', 'up', 'mute', null];

export const marksFromCode = (code: string): StrumMark[] => [...code].map((c) => CODE[c] ?? null);

export const codeFromMarks = (marks: StrumMark[]): string =>
  marks.map((mark) => (mark ? MARK_CODE[mark] : '.')).join('');

/** The next mark of a strum cell on a click: down → up → muted → rest → down. */
export const nextMark = (mark: StrumMark): StrumMark =>
  CYCLE[(CYCLE.indexOf(mark) + 1) % CYCLE.length];

/** The part a bar belongs to, or null on a card without parts. */
export function partOfBar(card: SongCard, bar: number): CardPart | null {
  return card.parts.find((part) => bar >= part.firstBar && bar < part.firstBar + part.bars) ?? null;
}

/** The strum of a bar: the teacher's for its group, else the analysis pattern with the direction rule. */
export function strumOfBar(card: SongCard, review: CardReview, bar: number): StrumMark[] | null {
  const group = partOfBar(card, bar)?.group;
  const own = group ? review.strums[group] : undefined;
  if (own) return marksFromCode(own);
  return card.strum ? strumFromRule(card.strum) : null;
}

export const isApproved = (review: CardReview, part: CardPart | null): boolean =>
  part === null || review.approvedGroups.includes(part.group);

/** The chord after `current` in the song's chords, for a click-through correction of a bar. */
export function nextChordFor(chords: string[], current: string): string {
  if (chords.length === 0) return current;
  return chords[(chords.indexOf(current) + 1) % chords.length];
}

export function applyReviewPatch(review: CardReview, patch: ReviewPatch): CardReview {
  if (patch.kind === 'approve') {
    const others = review.approvedGroups.filter((group) => group !== patch.group);
    return { ...review, approvedGroups: patch.isApproved ? [...others, patch.group] : others };
  }
  if (patch.kind === 'strum') {
    const { [patch.group]: _old, ...strums } = review.strums;
    return { ...review, strums: patch.code ? { ...strums, [patch.group]: patch.code } : strums };
  }
  const { [patch.bar]: _old, ...chordEdits } = review.chordEdits;
  return {
    ...review,
    chordEdits: patch.chord ? { ...chordEdits, [patch.bar]: patch.chord } : chordEdits,
  };
}
