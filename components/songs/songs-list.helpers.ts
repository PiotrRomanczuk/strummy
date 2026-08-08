import { SONG_LEVELS } from '@/components/shared/level-label.helpers';
import type {
  SongListLevel,
  SongsListFilters,
  SongsListSort,
} from '@/lib/services/songs-list-queries';

export const LEVELS: readonly SongListLevel[] = SONG_LEVELS;

/** The sort-pill row's own values — a subset of `SongsListSort`, which also
 * carries the `_asc`/`_desc` pairs the sortable table headers use. */
type PillSort = Extract<SongsListSort, 'newest' | 'oldest' | 'title'>;

export const SORTS: PillSort[] = ['newest', 'oldest', 'title'];

export const SORT_LABEL_KEYS: Record<PillSort, string> = {
  newest: 'sortNewest',
  oldest: 'sortOldest',
  title: 'sortTitle',
};

/** All musical keys offered as a filter (mirrors the edit form). */
export const KEYS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
  'Cm',
  'C#m',
  'Dm',
  'D#m',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'A#m',
  'Bm',
] as const;

/**
 * Build a `/dashboard/songs` href from the current filters plus an override.
 * Changing any filter (other than `page`) resets pagination to page 1.
 */
export const buildHref = (next: Partial<SongsListFilters>, current: SongsListFilters): string => {
  const merged = { ...current, ...next };
  // Any change other than `page` or `selected` resets pagination — but
  // opening/closing the panel shouldn't reset the page underneath it.
  const resetsPage = !('page' in next) && !('selected' in next);
  const params = new URLSearchParams();
  if (merged.level) params.set('level', merged.level);
  if (merged.key) params.set('key', merged.key);
  if (merged.author) params.set('author', merged.author);
  if (merged.category) params.set('category', merged.category);
  if (merged.search) params.set('search', merged.search);
  if (merged.sort !== 'newest') params.set('sort', merged.sort);
  const page = resetsPage ? 1 : merged.page;
  if (page > 1) params.set('page', String(page));
  if (merged.selected) params.set('selected', merged.selected);
  const qs = params.toString();
  return qs ? `/dashboard/songs?${qs}` : '/dashboard/songs';
};
