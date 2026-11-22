import { byStudents } from './mismatch-list';
import type { RepertoireSong } from './repertoire-song';

/** The first step of the pipeline a song has not reached: a recording, its analysis, its transcription. */
export type GapKind = 'recording' | 'analysis' | 'transcription';
export const GAP_KINDS: readonly GapKind[] = ['recording', 'analysis', 'transcription'];

export interface Coverage {
  total: number;
  withLink: number;
  withAnalysis: number;
  withTranscription: number;
  /** Analyses of a song with no recording link: song2logic found the recording elsewhere. */
  analysedWithoutLink: number;
  /** Songs missing any step. */
  incomplete: number;
  /** Each incomplete song once, under the first step it misses; most students first. */
  gaps: Record<GapKind, RepertoireSong[]>;
}

export function gapOf(song: RepertoireSong): GapKind | null {
  if (!song.measured) return song.hasLink ? 'analysis' : 'recording';
  return song.transcription ? null : 'transcription';
}

/**
 * What the repertoire has from its recordings. The order is the pipeline's: a song needs a recording before
 * song2logic can analyse it, and an analysed recording before `study` can transcribe it.
 */
export function coverageOf(songs: RepertoireSong[]): Coverage {
  const sorted = [...songs].sort(byStudents);
  const gaps = Object.fromEntries(
    GAP_KINDS.map((kind) => [kind, sorted.filter((song) => gapOf(song) === kind)])
  ) as Record<GapKind, RepertoireSong[]>;
  return {
    total: songs.length,
    withLink: songs.filter((song) => song.hasLink).length,
    withAnalysis: songs.filter((song) => song.measured).length,
    withTranscription: songs.filter((song) => song.transcription).length,
    analysedWithoutLink: songs.filter((song) => song.measured && !song.hasLink).length,
    incomplete: songs.filter((song) => gapOf(song) !== null).length,
    gaps,
  };
}

/** How many analysed songs count each number of beats per bar, most common first. */
export function beatsPerBarOf(songs: RepertoireSong[]): { beats: number; songs: number }[] {
  const counts = new Map<number, number>();
  for (const song of songs) {
    const beats = song.measured?.beatsPerBar;
    if (beats) counts.set(beats, (counts.get(beats) ?? 0) + 1);
  }
  return [...counts]
    .map(([beats, count]) => ({ beats, songs: count }))
    .sort((a, b) => b.songs - a.songs);
}
