/**
 * URL state for the Assignments list — the domain half of
 * `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md`. Mechanics (pagination
 * reset, default omission, sort-link resolution) come from
 * `@/components/shared/list-href.helpers`.
 *
 * Assignments encode sort as **two** params (`sort=title&dir=desc`) where songs
 * use one (`sort=title_desc`). Both are defensible — two params stay orthogonal
 * and do not double the enum per column — and the standard deliberately does not
 * mandate either. Kept as-is rather than churned; see the pattern doc's
 * "Known divergence" note.
 */

import { buildListHref, type ListBaseFilters } from '@/components/shared/list-href.helpers';
import type { AssignmentSortField } from '@/lib/services/assignment-list-params';

export const ASSIGNMENTS_PATH = '/dashboard/assignments';

export type AssignmentsListFilters = ListBaseFilters & {
  status?: string;
  studentId?: string;
  search?: string;
  sort?: AssignmentSortField;
  dir: 'asc' | 'desc';
};

/**
 * The single href builder for this list. Every control — status tabs, student
 * picker, search box, sortable headers, pagination, row links and the panel's
 * close button — routes through it.
 */
export const buildHref = (
  next: Partial<AssignmentsListFilters>,
  current: AssignmentsListFilters
): string =>
  buildListHref(ASSIGNMENTS_PATH, next, current, (m) => ({
    status: m.status,
    student: m.studentId,
    q: m.search,
    sort: m.sort,
    // `dir` is meaningless without a column, and `asc` is the default — emitting
    // either would put two URLs on the same view.
    dir: m.sort && m.dir === 'desc' ? 'desc' : undefined,
  }));

/**
 * Href + arrow state for a sortable column header.
 *
 * Unlike the single-param lists, the direction lives in its own param, so
 * "is this column active" is a comparison against `sort` and the flip is on
 * `dir`. Picking a new column always starts ascending.
 */
export const sortColumnLink = (
  field: AssignmentSortField,
  filters: AssignmentsListFilters
): { href: string; direction: 'asc' | 'desc' | null } => {
  const isActive = filters.sort === field;
  const direction = isActive ? filters.dir : null;
  const nextDir: 'asc' | 'desc' = isActive && filters.dir === 'asc' ? 'desc' : 'asc';
  return { href: buildHref({ sort: field, dir: nextDir }, filters), direction };
};
