/**
 * The songs table of the repertoire statistics (SNG-13): filtered, sorted and paged on the server from the URL,
 * the way every list in Strummy works (LIST_TABLE_PATTERN.md).
 */

import { mismatchesOf } from './mismatches';
import type { RepertoireSong } from './repertoire-song';

export const SONG_SORTS = ['students', 'title', 'tempo', 'key', 'duration'] as const;
export type SongSort = (typeof SONG_SORTS)[number];

export const TABLE_PAGE = 50;

export interface SongTableQuery {
  q: string;
  category: string | null;
  level: string | null;
  hasMismatches: boolean;
  sort: SongSort;
  isAscending: boolean;
  limit: number;
}

const text = (value: string | null) => (value ?? '').toLocaleLowerCase('pl');

const SORT_VALUE: Record<SongSort, (song: RepertoireSong) => string | number | null> = {
  students: (song) => song.students,
  title: (song) => text(song.title),
  tempo: (song) => song.measured?.bpm ?? song.entered.tempo,
  key: (song) => song.measured?.key ?? song.entered.key,
  duration: (song) => song.measured?.durationMs ?? song.entered.durationMs,
};

/** Compares two sort values; an empty value always sorts last. */
function compareValues(a: string | number | null, b: string | number | null, isAscending: boolean) {
  if (a === null || a === '') return b === null || b === '' ? 0 : 1;
  if (b === null || b === '') return -1;
  const order =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return isAscending ? order : -order;
}

export function songTableOf(songs: RepertoireSong[], query: SongTableQuery) {
  const needle = text(query.q.trim());
  const filtered = songs.filter(
    (song) =>
      (!needle || text(song.title).includes(needle) || text(song.author).includes(needle)) &&
      (!query.category || song.category === query.category) &&
      (!query.level || song.level === query.level) &&
      (!query.hasMismatches || mismatchesOf(song).length > 0)
  );
  const value = SORT_VALUE[query.sort];
  const sorted = [...filtered].sort(
    (a, b) => compareValues(value(a), value(b), query.isAscending) || a.title.localeCompare(b.title)
  );
  return { total: filtered.length, rows: sorted.slice(0, query.limit) };
}

/** The values of a column, most common first: categories and levels for the filters. */
export function facetOf(songs: RepertoireSong[], pick: (song: RepertoireSong) => string | null) {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const value = pick(song);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
}
