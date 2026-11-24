import type { SongCard } from '@/lib/music-theory/song-card';

/** What the card plays: the embedded recording or the backing track. */
export type CardSource = 'recording' | 'backing';

/**
 * The song card's practice settings in its address (homework links): the part by song2logic number, the loop,
 * the tempo in percent and the backing track — `?part=4&loop=1&tempo=45&source=backing`.
 */
export interface CardStart {
  /** 0-based index into `card.parts`, or null for the beginning of the song. */
  part: number | null;
  isLooping: boolean;
  /** Playback rate, 0.4–1. */
  rate: number;
  source: CardSource;
}

export const PRACTICE_RATES = [0.5, 0.6, 0.75, 0.9, 1] as const;
const MIN_RATE = 0.5;
/** A link may ask for a backing-track tempo below the player's half speed. */
const MIN_LINK_RATE = 0.4;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseCardStart(
  params: Record<string, string | string[] | undefined>,
  card: SongCard | null
): CardStart {
  const n = Number(one(params.part));
  const part = card?.parts.findIndex((p) => p.n === n) ?? -1;
  const tempo = Number(one(params.tempo));
  const rate =
    Number.isFinite(tempo) && tempo >= MIN_LINK_RATE * 100 && tempo <= 100 ? tempo / 100 : 1;
  return {
    part: part >= 0 ? part : null,
    isLooping: part >= 0 && one(params.loop) === '1',
    rate,
    source: one(params.source) === 'backing' ? 'backing' : 'recording',
  };
}

export function cardLink(path: string, card: SongCard, start: CardStart): string {
  const query = new URLSearchParams();
  const part = start.part === null ? null : card.parts[start.part];
  if (part) query.set('part', String(part.n));
  if (part && start.isLooping) query.set('loop', '1');
  if (start.rate !== 1) query.set('tempo', String(Math.round(start.rate * 100)));
  if (start.source === 'backing') query.set('source', 'backing');
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

/**
 * The slower speeds worth offering for practice among what the player supports (YouTube usually gives 0.25 steps;
 * a player with fine steps is cut down to the practice ladder). Always includes 1.
 */
export function practiceRates(available: number[]): number[] {
  const usable = available.filter((rate) => rate >= MIN_RATE && rate <= 1);
  const rates =
    usable.length > PRACTICE_RATES.length
      ? PRACTICE_RATES.filter((rate) => usable.includes(rate))
      : usable;
  return [...new Set([...rates, 1])].sort((a, b) => a - b);
}

/** The supported speed closest to a requested one without going faster. */
export function nearestRate(rates: number[], wanted: number): number {
  return rates.filter((rate) => rate <= wanted).at(-1) ?? rates[0] ?? 1;
}
