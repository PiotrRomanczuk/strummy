import type { SongOption } from '@/lib/services/lesson-form-data';

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercase + strip diacritics so "zolte" finds "Żółte Kalendarze". NFD splits
 * most accents into combining marks; ł/ø have no decomposition, so they are
 * mapped by hand.
 */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o');

/** 0 = title starts with the query, 1 = title contains it, 2 = author-only hit. */
const rankOf = (title: string, query: string): number => {
  if (title.startsWith(query)) return 0;
  if (title.includes(query)) return 1;
  return 2;
};

/**
 * Songs matching every whitespace-separated token across title + author, best
 * title matches first. Ties keep the incoming (alphabetical) order.
 */
export const filterSongs = (songs: SongOption[], query: string): SongOption[] => {
  const trimmed = normalize(query.trim());
  if (!trimmed) return songs;

  const tokens = trimmed.split(/\s+/);
  const hits: { song: SongOption; rank: number; index: number }[] = [];

  songs.forEach((song, index) => {
    const title = normalize(song.title);
    const haystack = `${title} ${normalize(song.author ?? '')}`;
    if (!tokens.every((token) => haystack.includes(token))) return;
    hits.push({ song, rank: rankOf(title, trimmed), index });
  });

  return hits.sort((a, b) => a.rank - b.rank || a.index - b.index).map((hit) => hit.song);
};

/** Selected ids resolved to songs, in the order they were picked. */
export const resolveSelected = (songs: SongOption[], selectedIds: string[]): SongOption[] => {
  const byId = new Map(songs.map((song) => [song.id, song]));
  return selectedIds.map((id) => byId.get(id)).filter((song): song is SongOption => Boolean(song));
};
