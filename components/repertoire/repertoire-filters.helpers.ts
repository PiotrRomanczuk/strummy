import type { StudentRepertoireWithSong } from '@/types/StudentRepertoire';

/** Stage values a repertoire entry can hold, in learning order. */
export const STAGES = ['to_learn', 'started', 'remembered', 'with_author', 'mastered'] as const;
export type Stage = (typeof STAGES)[number];

export const SORTS = ['recent', 'title', 'stage'] as const;
export type RepertoireSort = (typeof SORTS)[number];

export const DEFAULT_SORT: RepertoireSort = 'recent';

export type RepertoireFilters = {
  search?: string;
  stage?: Stage;
  sort: RepertoireSort;
};

const STAGE_ORDER: Record<string, number> = Object.fromEntries(
  STAGES.map((s, i) => [s, i])
) as Record<string, number>;

/**
 * Filtering runs in the app, not the database, because the repertoire page
 * already loads every entry for the signed-in student in one RLS-scoped read
 * and does not paginate. A student's repertoire is tens of rows, not
 * thousands. If it ever paginates, this moves into the query.
 */
export const filterEntries = (
  entries: StudentRepertoireWithSong[],
  filters: RepertoireFilters
): StudentRepertoireWithSong[] => {
  const needle = filters.search?.toLowerCase();

  const matched = entries.filter((e) => {
    if (filters.stage && e.current_status !== filters.stage) return false;
    if (!needle) return true;
    // Title and author both — searching "beatles" should find their songs.
    const haystack = `${e.song?.title ?? ''} ${e.song?.author ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });

  return sortEntries(matched, filters.sort);
};

const sortEntries = (
  entries: StudentRepertoireWithSong[],
  sort: RepertoireSort
): StudentRepertoireWithSong[] => {
  const rows = [...entries];

  if (sort === 'title') {
    return rows.sort((a, b) =>
      (a.song?.title ?? '').localeCompare(b.song?.title ?? '', undefined, { sensitivity: 'base' })
    );
  }

  if (sort === 'stage') {
    // Furthest along first, then alphabetical so equal stages are stable.
    return rows.sort((a, b) => {
      const delta = (STAGE_ORDER[b.current_status] ?? -1) - (STAGE_ORDER[a.current_status] ?? -1);
      if (delta !== 0) return delta;
      return (a.song?.title ?? '').localeCompare(b.song?.title ?? '', undefined, {
        sensitivity: 'base',
      });
    });
  }

  // 'recent' — most recently practised first. Never-practised rows sort last
  // rather than first, which is what a null date would otherwise do.
  return rows.sort((a, b) => {
    const at = a.last_practiced_at ? Date.parse(a.last_practiced_at) : -Infinity;
    const bt = b.last_practiced_at ? Date.parse(b.last_practiced_at) : -Infinity;
    if (at === bt) {
      return (a.song?.title ?? '').localeCompare(b.song?.title ?? '', undefined, {
        sensitivity: 'base',
      });
    }
    return bt - at;
  });
};

/** Per-stage counts for the chip row, computed before the stage filter is
 *  applied so the counts do not collapse to the selected chip. */
export const stageCounts = (
  entries: StudentRepertoireWithSong[],
  search?: string
): Record<Stage, number> => {
  const needle = search?.toLowerCase();
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;

  for (const e of entries) {
    if (needle) {
      const haystack = `${e.song?.title ?? ''} ${e.song?.author ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }
    if (e.current_status in counts) counts[e.current_status as Stage] += 1;
  }
  return counts;
};
