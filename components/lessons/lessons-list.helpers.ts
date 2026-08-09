/**
 * URL state for the Lessons list — the domain half of
 * `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md`. The mechanics
 * (pagination reset, default omission, sort-link resolution) live in
 * `@/components/shared/list-href.helpers`; this file supplies only the
 * vocabulary lessons actually use.
 *
 * View model: with no `sort=` param the list stays grouped by time bucket
 * (Today / This week / …). Any sort — the toggle or a column header — adds
 * `sort=` and flips the list into a flat, fully-sorted table. `flat` therefore
 * means "a sort param is present". That grouped/flat switch is specific to
 * lessons and has no songs equivalent; it is not drift from the standard.
 */

import {
  buildListHref,
  resolveSortLink,
  type ListBaseFilters,
} from '@/components/shared/list-href.helpers';
import type { LessonsSortValue } from '@/lib/services/lessons-queries';

export const STATUS_KEYS = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export type LessonsSort = LessonsSortValue;

export type LessonsListFilters = ListBaseFilters & {
  statuses: string[];
  sort: LessonsSort;
  /** Undefined = no year filter (all years). */
  year?: number;
  /** True once a `sort=` param is present — flips grouped → flat sorted table. */
  flat: boolean;
};

/** Sortable columns and the [asc, desc] value each toggles between. */
export const LESSON_SORT_PAIRS = {
  date: ['oldest', 'newest'],
  title: ['title_asc', 'title_desc'],
  status: ['status_asc', 'status_desc'],
} as const satisfies Record<string, readonly [LessonsSort, LessonsSort]>;

export type LessonSortableCol = keyof typeof LESSON_SORT_PAIRS;

/**
 * The single href builder for this list. Every control — status chips, year
 * select, sortable headers, pagination, row links, the panel's close button —
 * routes through it.
 *
 * Replaces the previous four positional builders (`pageHref`, `statusHref`,
 * `sortHref`, `yearHref`): adding a facet to those meant editing five call
 * sites, and each one silently decided for itself whether to keep the page.
 */
export const buildHref = (
  next: Partial<LessonsListFilters>,
  current: LessonsListFilters
): string =>
  buildListHref('/dashboard/lessons', next, current, (m) => ({
    // All statuses selected is the same view as none — keep it out of the URL.
    status:
      m.statuses.length > 0 && m.statuses.length < STATUS_KEYS.length
        ? m.statuses.join(',')
        : undefined,
    // `sort` is emitted only in flat mode; its absence is what keeps the
    // grouped view grouped.
    sort: m.flat ? m.sort : undefined,
    year: m.year !== undefined ? String(m.year) : undefined,
  }));

/** Toggle one status chip on/off. */
export const toggleStatus = (statuses: string[], toggle: string): string[] =>
  statuses.includes(toggle) ? statuses.filter((s) => s !== toggle) : [...statuses, toggle];

/**
 * Href + arrow state for a sortable column header. Picking any column enters
 * flat mode — a grouped list cannot honour a column ordering.
 */
export const sortColumnLink = (
  col: LessonSortableCol,
  filters: LessonsListFilters
): { href: string; direction: 'asc' | 'desc' | null } => {
  const { next, direction } = resolveSortLink(LESSON_SORT_PAIRS[col], filters.sort);
  return {
    href: buildHref({ sort: next, flat: true }, filters),
    // While grouped, no column owns the ordering, so no column shows an arrow.
    direction: filters.flat ? direction : null,
  };
};

/** Years offered in the filter row: the current year and the two prior. */
export const yearOptions = (now: Date): number[] => {
  const current = now.getUTCFullYear();
  return [current, current - 1, current - 2];
};
