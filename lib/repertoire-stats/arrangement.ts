/**
 * Arrangement profile (SNG-13): per track of the transcription, whether it plays, how many notes per bar and its
 * pitch range, for up to three songs against the range of that track across every transcribed song.
 */

import type { RepertoireSong, TrackSummary } from './repertoire-song';

/** Tracks in the order song2logic's `study` writes them; the pitched ones have a meaningful range. */
export const TRACKS = [
  'Wokal',
  'Bas',
  'Gitara',
  'Pianino',
  'Stopa',
  'Werbel',
  'Hi-hat',
  'Ride',
  'Crash',
  'Tomy',
  'Reszta',
] as const;
const PITCHED = new Set<string>(['Wokal', 'Bas', 'Gitara', 'Pianino', 'Reszta']);

export const MAX_ARRANGEMENT_SONGS = 3;

export interface TrackProfile {
  track: string;
  isPitched: boolean;
  /** Lowest and highest note of the track across the transcribed repertoire; null for drums. */
  repertoireRange: [number, number] | null;
  /** The densest song's notes per bar: the scale of the bars. */
  maxPerBar: number;
  /** One per selected song, in order; null when the track does not play in that song. */
  songs: (TrackSummary | null)[];
}

const plays = (track: TrackSummary | undefined): track is TrackSummary =>
  !!track && track.notes > 0;

function rangeOf(summaries: TrackSummary[]): [number, number] | null {
  const lows = summaries.flatMap((summary) => (summary.low === null ? [] : [summary.low]));
  const highs = summaries.flatMap((summary) => (summary.high === null ? [] : [summary.high]));
  return lows.length && highs.length ? [Math.min(...lows), Math.max(...highs)] : null;
}

export function arrangementOf(
  transcribed: RepertoireSong[],
  selected: RepertoireSong[]
): TrackProfile[] {
  return TRACKS.map((track) => {
    const summaries = transcribed.map((song) => song.transcription?.tracks[track]).filter(plays);
    const isPitched = PITCHED.has(track);
    return {
      track,
      isPitched,
      repertoireRange: isPitched ? rangeOf(summaries) : null,
      maxPerBar: Math.max(0, ...summaries.map((summary) => summary.perBar)),
      songs: selected.map((song) => {
        const summary = song.transcription?.tracks[track];
        return plays(summary) ? summary : null;
      }),
    };
  });
}
