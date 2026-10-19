import type { SupabaseClient } from '@supabase/supabase-js';

import type { DraftSong, SongMatch } from '@/lib/ai/schemas/lesson-transcript-draft';

/**
 * Resolves the songs a transcript draft mentions to catalog rows (CNT-8).
 * Speech recognition mangles titles ("Blitzkrieg Pub"), so matching is fuzzy:
 * bigram similarity on normalised titles, nudged by the artist when known.
 */

export const SONG_MATCH_THRESHOLD = 0.6;

export type CatalogSong = { id: string; title: string; author: string | null };

/** Lowercase, no diacritics, no punctuation, no leading "the". */
export function normalizeTitle(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^the /, '');
}

function bigrams(text: string): string[] {
  const s = normalizeTitle(text).replace(/ /g, '');
  return Array.from({ length: Math.max(s.length - 1, 0) }, (_, i) => s.slice(i, i + 2));
}

/** Sørensen–Dice coefficient on character bigrams, 0–1. */
export function similarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.length || !right.length) return normalizeTitle(a) === normalizeTitle(b) ? 1 : 0;
  const pool = [...right];
  const shared = left.filter((g) => {
    const i = pool.indexOf(g);
    if (i === -1) return false;
    pool.splice(i, 1);
    return true;
  }).length;
  return (2 * shared) / (left.length + right.length);
}

/** Models glue the artist onto the title ("Cocaine Clapton"); score the title without it. */
function titleWithoutArtist(title: string, artist: string | null): string {
  if (!artist) return title;
  const artistWords = new Set(normalizeTitle(artist).split(' '));
  const kept = normalizeTitle(title)
    .split(' ')
    .filter((w) => !artistWords.has(w));
  return kept.length ? kept.join(' ') : title;
}

export function scoreCandidate(song: Pick<DraftSong, 'heardTitle' | 'heardArtist'>, row: CatalogSong): number {
  const title = Math.max(
    similarity(song.heardTitle, row.title),
    similarity(titleWithoutArtist(song.heardTitle, song.heardArtist), row.title)
  );
  if (!song.heardArtist || !row.author) return title;
  return 0.75 * title + 0.25 * similarity(song.heardArtist, row.author);
}

const NO_MATCH: SongMatch = { songId: null, title: null, author: null, score: 0 };

export function bestMatch(song: DraftSong, candidates: CatalogSong[]): SongMatch {
  if (song.catalogTitle) {
    const exact = candidates.find((c) => normalizeTitle(c.title) === normalizeTitle(song.catalogTitle ?? ''));
    if (exact) return { songId: exact.id, title: exact.title, author: exact.author, score: 1 };
  }
  const ranked = candidates
    .map((row) => ({ row, score: scoreCandidate(song, row) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score < SONG_MATCH_THRESHOLD) {
    return top ? { ...NO_MATCH, score: Number(top.score.toFixed(2)) } : NO_MATCH;
  }
  return { songId: top.row.id, title: top.row.title, author: top.row.author, score: Number(top.score.toFixed(2)) };
}

/** Longest word of the title or artist — the most selective ilike needle. */
function searchNeedles(song: DraftSong): string[] {
  const words = [song.heardTitle, song.heardArtist ?? '']
    .flatMap((t) => normalizeTitle(t).split(' '))
    .filter((w) => w.length >= 3);
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 2);
}

async function searchCatalog(supabase: SupabaseClient, song: DraftSong): Promise<CatalogSong[]> {
  const needles = searchNeedles(song);
  if (!needles.length) return [];
  // Needles are letters/digits only (normalizeTitle), so they are safe in a PostgREST filter.
  const filter = needles.flatMap((n) => [`title.ilike.%${n}%`, `author.ilike.%${n}%`]).join(',');
  const { data } = await supabase
    .from('songs')
    .select('id, title, author')
    .is('deleted_at', null)
    .or(filter)
    .limit(30);
  return (data ?? []) as CatalogSong[];
}

/**
 * Known songs (repertoire + recent lessons) first, the whole catalog second.
 * A song the student already plays wins over a better-scoring stranger.
 */
export async function matchDraftSong(
  supabase: SupabaseClient,
  song: DraftSong,
  knownSongs: CatalogSong[]
): Promise<SongMatch> {
  const known = bestMatch(song, knownSongs);
  if (known.songId) return known;
  return bestMatch(song, await searchCatalog(supabase, song));
}
