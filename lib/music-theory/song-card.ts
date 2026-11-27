import type { BassNote, Groove, SongPart } from '@/schemas/SongSegmentsSchema';
import type { CardCapo, CardChord, CardGrid } from '@/schemas/SongCardSchema';

import { partKind, splitKey, type PartKind } from './song-map';
import { recordingTempo, type SongTempo } from './song-tempo';

/**
 * The song card (SNG-17): one recording's analysis as bars in seconds, the parts over them and the guitar's
 * strum. Pure — built from what `getSongCard` read; the clock helpers are in `song-card-clock.ts`.
 */

/** No chord ("N" in song2logic). */
export const NO_CHORD = 'N';

export interface CardBar {
  start: number;
  end: number;
  /** The chord of each half of the bar. */
  halves: [string, string];
}

export interface CardPart {
  n: number;
  kind: PartKind | null;
  /** song2logic's letter, the fallback name of an unnamed part. */
  label: string;
  /** Which of the song's parts of this kind it is (1-based) and how many there are. */
  ordinal: number;
  ofKind: number;
  /** 0-based index of its first bar in `bars`. */
  firstBar: number;
  bars: number;
  start: number;
  end: number;
  /** Parts of one kind built on the same loop share a group: the teacher reviews them together. */
  group: string;
  roman: string[];
  loop: string[];
  drums: Groove | null;
  /** The bass bar by bar, or null when the bass rests. */
  bass: BassNote[][] | null;
}

export interface SongCard {
  duration: number;
  /** The beat the analysis counted: the beat grid and the backing track run on it. */
  bpm: number;
  /** The tempo to show and practise from (`song-tempo.ts`): the counted beat at the song's pulse. */
  tempo: SongTempo;
  beatsPerBar: number;
  key: { tonic: string; isMinor: boolean } | null;
  bars: CardBar[];
  parts: CardPart[];
  /** The guitar's pattern, one mark per sixteenth ("X" strong, "x" weak, "." none). */
  strum: string | null;
  capo: CardCapo | null;
  youtubeId: string | null;
  /** When the analysis was loaded (ISO date), or null. */
  analysedOn: string | null;
}

export interface SongCardInput {
  sourceUrl: string | null;
  analysedOn: string | null;
  duration: number | null;
  grid: CardGrid;
  key: { tonic: string; scale: string } | null;
  chords: CardChord[];
  rhythm: { track: string; pattern: string }[];
  capo: CardCapo | null;
  songBpm?: number | null; // the teacher's tempo (`songs.tempo`)
  feltBpm?: number | null; // song2logic's felt tempo of a half-time feel
  /** Present only when they were heard in the same recording as the analysis. */
  segments: { parts: SongPart[]; bassBars: (BassNote[][] | null)[] } | null;
}

const YOUTUBE_ID = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/;
const GUITAR_TRACK = 'Gitara';
const SLOTS = 16;

/** The video id of any YouTube link form, or null. */
export function youtubeId(url: string | null): string | null {
  return url?.match(YOUTUBE_ID)?.[1] ?? null;
}

/** Bar starts: the analysed downbeats, or every bar's first beat in an older analysis. */
function barStarts(grid: CardGrid): number[] {
  if (grid.downbeats_s?.length) return grid.downbeats_s;
  return grid.beats_s.filter((_, i) => i % grid.beats_per_bar === 0);
}

export function cardBars(grid: CardGrid, chords: CardChord[], duration: number): CardBar[] {
  const byBar = new Map(chords.map((chord) => [chord.bar, chord]));
  const starts = barStarts(grid);
  return starts.map((start, i) => {
    const chord = byBar.get(i + 1);
    const first = chord?.halves?.[0] ?? chord?.chord ?? NO_CHORD;
    const second = chord?.halves?.[1] ?? first;
    return { start, end: starts[i + 1] ?? duration, halves: [first, second] };
  });
}

export function cardParts(parts: SongPart[], bassBars: (BassNote[][] | null)[]): CardPart[] {
  const ofKind = new Map<string, number>();
  for (const part of parts)
    ofKind.set(part.name ?? part.label, (ofKind.get(part.name ?? part.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return parts.map((part, i) => {
    const kindKey = part.name ?? part.label;
    seen.set(kindKey, (seen.get(kindKey) ?? 0) + 1);
    return {
      n: part.n,
      kind: partKind(part.name),
      label: part.label,
      ordinal: seen.get(kindKey) ?? 1,
      ofKind: ofKind.get(kindKey) ?? 1,
      firstBar: part.first_bar - 1,
      bars: part.bars,
      start: i === 0 ? 0 : part.start_s,
      end: part.end_s,
      group: `${kindKey}:${part.loop.join('-')}`,
      roman: part.roman,
      loop: part.loop,
      drums: part.drums,
      bass: bassBars[i] ?? null,
    };
  });
}

export function buildSongCard(input: SongCardInput): SongCard {
  const duration = input.duration ?? input.grid.beats_s.at(-1) ?? 0;
  const guitar = input.rhythm.find((track) => track.track === GUITAR_TRACK);
  return {
    duration,
    bpm: input.grid.bpm,
    tempo: recordingTempo({
      recordingBpm: input.grid.bpm,
      feltBpm: input.feltBpm ?? null,
      songBpm: input.songBpm ?? null,
    }),
    beatsPerBar: input.grid.beats_per_bar,
    key: input.key ? splitKey(`${input.key.tonic} ${input.key.scale}`) : null,
    bars: cardBars(input.grid, input.chords, duration),
    parts: input.segments ? cardParts(input.segments.parts, input.segments.bassBars) : [],
    strum: guitar?.pattern.length === SLOTS ? guitar.pattern : null,
    capo: input.capo && input.capo.fret > 0 ? input.capo : null,
    youtubeId: youtubeId(input.sourceUrl),
    analysedOn: input.analysedOn?.slice(0, 10) ?? null,
  };
}
