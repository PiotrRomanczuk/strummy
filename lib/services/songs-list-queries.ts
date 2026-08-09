import { createClient } from '@/lib/supabase/server';
import { getSongsHandler, type SongQueryParams } from '@/app/api/song/handlers';
import type { Song } from '@/components/songs/types';
import { SONG_LEVELS, type SongLevel } from '@/components/shared/level-label.helpers';

export type SongListLevel = SongLevel;

/** Page size for the songs list. */
export const SONGS_PAGE_SIZE = 50;

/**
 * `newest`/`oldest`/`title` are the existing sort-pill values (kept exactly
 * as-is so old bookmarked/shared URLs keep working). The `_asc`/`_desc` pairs
 * back the sortable table column headers added alongside the pills.
 */
export type SongsListSort =
  | 'newest'
  | 'oldest'
  | 'title'
  | 'title_desc'
  | 'author_asc'
  | 'author_desc'
  | 'level_asc'
  | 'level_desc'
  | 'key_asc'
  | 'key_desc';

export type SongsListFilters = {
  level?: SongListLevel;
  key?: string;
  author?: string;
  search?: string;
  category?: string;
  sort: SongsListSort;
  page: number;
  /** Song id shown in the slide-in detail panel, if any. */
  selected?: string;
};

export type SongsBreakdown = Record<SongListLevel | 'unset', number>;
export type CategoryBreakdown = { category: string; count: number }[];

export type SongsListResult = {
  songs: Song[];
  total: number;
  page: number;
  totalPages: number;
  breakdown: SongsBreakdown;
  categories: CategoryBreakdown;
};

const LEVELS: readonly SongListLevel[] = SONG_LEVELS;

function resolveSort(sort: SongsListSort): Pick<SongQueryParams, 'sortBy' | 'sortOrder'> {
  const map: Record<SongsListSort, Pick<SongQueryParams, 'sortBy' | 'sortOrder'>> = {
    newest: { sortBy: 'created_at', sortOrder: 'desc' },
    oldest: { sortBy: 'created_at', sortOrder: 'asc' },
    title: { sortBy: 'title', sortOrder: 'asc' },
    title_desc: { sortBy: 'title', sortOrder: 'desc' },
    author_asc: { sortBy: 'author', sortOrder: 'asc' },
    author_desc: { sortBy: 'author', sortOrder: 'desc' },
    level_asc: { sortBy: 'level', sortOrder: 'asc' },
    level_desc: { sortBy: 'level', sortOrder: 'desc' },
    key_asc: { sortBy: 'key', sortOrder: 'asc' },
    key_desc: { sortBy: 'key', sortOrder: 'desc' },
  };
  return map[sort];
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

/**
 * Level counts for the filter chips. Respects key/author/search but ignores
 * the active `level` filter (so the user can see how many rows each level
 * holds before switching). Runs under the same RLS-scoped client as the list.
 */
async function loadBreakdown(
  supabase: SupabaseLike,
  filters: SongsListFilters
): Promise<SongsBreakdown> {
  let query = supabase.from('songs').select('level').is('deleted_at', null);
  if (filters.key) query = query.eq('key', filters.key);
  if (filters.author) query = query.eq('author', filters.author);
  const search = filters.search?.trim();
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    throw new Error(`songs breakdown query failed: ${error.message}`);
  }

  // Every level must have a bucket — a missing one would silently land in
  // `unset` and make the level look empty in the filter counts.
  const breakdown = {
    ...Object.fromEntries(LEVELS.map((l) => [l, 0])),
    unset: 0,
  } as SongsBreakdown;
  for (const row of data ?? []) {
    const lvl = (row as { level: string | null }).level as SongListLevel | null;
    if (lvl && LEVELS.includes(lvl)) breakdown[lvl] += 1;
    else breakdown.unset += 1;
  }
  return breakdown;
}

/**
 * Distinct categories present in the catalog, with counts — backs the genre
 * tab strip. Respects every filter except `category` itself, same reasoning
 * as `loadBreakdown`. Categories are free text (no enum), so this is a real
 * query rather than a fixed list.
 */
async function loadCategoryBreakdown(
  supabase: SupabaseLike,
  filters: SongsListFilters
): Promise<CategoryBreakdown> {
  let query = supabase.from('songs').select('category').is('deleted_at', null);
  if (filters.level) query = query.eq('level', filters.level);
  if (filters.key) query = query.eq('key', filters.key);
  if (filters.author) query = query.eq('author', filters.author);
  const search = filters.search?.trim();
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    throw new Error(`songs category breakdown query failed: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const category = (row as { category: string | null }).category?.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * List songs for the list page.
 *
 * Reads through an RLS-respecting client (`createClient`) so the database —
 * not app code — scopes the result: `songs_select_active` (ADR-0001) lets any
 * authenticated user, including students, read every non-deleted row — this
 * is a shared, teacher-curated catalog, not a per-student view. A student's
 * own songs live on `student_repertoire` instead. The old restrictive
 * `songs_select_policy` this comment used to describe was dropped in the
 * July 2026 rebuild. We do NOT re-filter by role here.
 *
 * Errors are surfaced (thrown → caught by the route error boundary), never
 * swallowed into an empty list.
 */
export async function getSongsForList(
  user: { id: string },
  roles: { isAdmin: boolean; isTeacher: boolean; isStudent: boolean },
  filters: SongsListFilters
): Promise<SongsListResult> {
  const supabase = await createClient();
  const profile = { isAdmin: roles.isAdmin, isTeacher: roles.isTeacher };
  const page = Math.max(1, filters.page || 1);

  const params: SongQueryParams = {
    ...resolveSort(filters.sort),
    level: filters.level,
    key: filters.key,
    author: filters.author,
    category: filters.category,
    search: filters.search?.trim() || undefined,
    page,
    limit: SONGS_PAGE_SIZE,
  };

  const [result, breakdown, categories] = await Promise.all([
    getSongsHandler(supabase, user, profile, params),
    loadBreakdown(supabase, filters),
    loadCategoryBreakdown(supabase, filters),
  ]);

  if ('error' in result) {
    throw new Error(`songs list query failed: ${result.error}`);
  }

  const total = result.count ?? result.songs.length;
  const totalPages = Math.max(1, Math.ceil(total / SONGS_PAGE_SIZE));

  return { songs: result.songs, total, page, totalPages, breakdown, categories };
}
