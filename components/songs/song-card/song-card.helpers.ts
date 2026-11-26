import { NO_CHORD, type CardPart, type SongCard } from '@/lib/music-theory/song-card';
import type { CardPosition } from '@/lib/music-theory/song-card-clock';

import { KIND_LABEL } from '../SongMapCard.Parts';

/** Bars a card without parts shows at once, as one page of the chord chart. */
export const BARS_PER_PAGE = 16;

/** "1:05" */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The translation key of a part's name (Songs namespace) and its number among parts of its kind. */
export function partNameKey(part: CardPart): {
  key: (typeof KIND_LABEL)[keyof typeof KIND_LABEL] | null;
  ordinal: number | null;
} {
  return {
    key: part.kind ? KIND_LABEL[part.kind] : null,
    ordinal: part.ofKind > 1 ? part.ordinal : null,
  };
}

/** The bars the chord chart shows: the current part, or the page of bars around the playhead. */
export function shownBars(card: SongCard, position: CardPosition): [number, number] {
  const part = card.parts[position.part];
  if (part) return [part.firstBar, Math.min(card.bars.length, part.firstBar + part.bars)];
  const from = Math.floor(position.bar / BARS_PER_PAGE) * BARS_PER_PAGE;
  return [from, Math.min(card.bars.length, from + BARS_PER_PAGE)];
}

/** "–" for no chord. */
export function chordLabel(chord: string): string {
  return chord === NO_CHORD ? '–' : chord;
}

/** A playhead or region edge as a share of the recording, for a runtime `left`/`width`. */
export function percentOf(seconds: number, duration: number): string {
  if (duration <= 0) return '0%';
  return `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%`;
}
