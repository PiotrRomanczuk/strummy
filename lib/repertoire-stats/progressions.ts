/**
 * Progressions of the repertoire (SNG-13), as song2logic heard them: Roman numerals against each recording's key,
 * so songs in different keys share a progression. Known patterns (Pop, Blues, ii–V–I…) are matched on the
 * progression with repeated chords merged, in any rotation.
 */

import { ARCHETYPES, detectArchetypes } from '@/lib/music-theory/progression-archetypes';

import { byStudents } from './mismatch-list';
import type { RepertoireSong } from './repertoire-song';

export interface ProgressionSongs {
  /** The progression as heard, e.g. "I I V V": the ranking keeps repeats, they are part of the rhythm. */
  roman: string[];
  songs: { song: RepertoireSong; bars: number }[];
}

export interface KnownPattern {
  name: string;
  pattern: string[];
  songs: RepertoireSong[];
}

export const progressionKey = (roman: string[]) => roman.join(' ');

/** Drops a chord that repeats the one before it ("I I V V" → "I V"). */
export function collapse<T>(items: T[], same: (a: T, b: T) => boolean = (a, b) => a === b): T[] {
  return items.filter((item, i) => i === 0 || !same(item, items[i - 1]));
}

/** Every progression heard in the repertoire with the songs that have it, most songs first. */
export function progressionRankingOf(songs: RepertoireSong[]): ProgressionSongs[] {
  const ranking = new Map<string, ProgressionSongs>();
  for (const song of [...songs].sort(byStudents)) {
    for (const progression of song.measured?.progressions ?? []) {
      const key = progressionKey(progression.roman);
      const entry = ranking.get(key) ?? { roman: progression.roman, songs: [] };
      const same = entry.songs.find((found) => found.song.id === song.id);
      if (same) same.bars += progression.bars;
      else entry.songs.push({ song, bars: progression.bars });
      ranking.set(key, entry);
    }
  }
  return [...ranking.values()].sort(
    (a, b) =>
      b.songs.length - a.songs.length ||
      progressionKey(a.roman).localeCompare(progressionKey(b.roman))
  );
}

/** Songs with each known pattern in any of their progressions, most songs first. */
export function knownPatternsOf(songs: RepertoireSong[]): KnownPattern[] {
  return ARCHETYPES.map((archetype) => ({
    name: archetype.name,
    pattern: archetype.pattern,
    songs: [...songs]
      .sort(byStudents)
      .filter((song) =>
        (song.measured?.progressions ?? []).some((progression) =>
          detectArchetypes(collapse(progression.roman)).some(
            (found) => found.name === archetype.name
          )
        )
      ),
  })).sort((a, b) => b.songs.length - a.songs.length);
}
