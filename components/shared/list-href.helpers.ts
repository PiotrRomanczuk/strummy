/**
 * URL construction for browsable lists — the mechanical half of
 * `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md`.
 *
 * Every list holds its whole state in the query string, so every link in it
 * (sort headers, pagination, tabs, rows, the panel's close button) is the
 * current filters plus one override. This module owns the two rules that are
 * identical across domains — pagination reset and default omission — while
 * each domain supplies its own facet vocabulary.
 */

/** The shape every list's filter struct extends. */
export type ListBaseFilters = {
  page: number;
  /** Id of the record open in the detail panel, if any. */
  selected?: string;
};

/**
 * Build a list URL from the current filters plus an override.
 *
 * `facets` maps the domain's own filters to query values; return `undefined`
 * for anything at its default so it stays out of the URL — `?sort=newest&page=1`
 * and a bare path must not both be reachable views of the same thing.
 *
 * @example
 * export const buildHref = (next: Partial<SongsListFilters>, current: SongsListFilters) =>
 *   buildListHref('/dashboard/songs', next, current, (m) => ({
 *     level: m.level,
 *     search: m.search,
 *     sort: m.sort !== 'newest' ? m.sort : undefined,
 *   }));
 */
export const buildListHref = <F extends ListBaseFilters>(
  basePath: string,
  next: Partial<F>,
  current: F,
  facets: (merged: F) => Record<string, string | undefined>
): string => {
  const merged = { ...current, ...next };

  // Changing a filter while on page 7 must return to page 1 — page 7 of the new
  // result set is usually empty, which reads to the user as "no results" and is
  // the single most common list bug. Opening or closing the detail panel is NOT
  // a filter change: the list underneath is unchanged, so the page must survive.
  const resetsPage = !('page' in next) && !('selected' in next);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(facets(merged))) {
    if (value) params.set(key, value);
  }

  const page = resetsPage ? 1 : merged.page;
  if (page > 1) params.set('page', String(page));
  if (merged.selected) params.set('selected', merged.selected);

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

/**
 * Toggle semantics for a facet: picking the value that is already active
 * clears it. Tabs and chips toggle rather than trap — without this a user who
 * clicks "Pop" has no way back to "All" except the browser Back button.
 */
export const toggleValue = <T>(current: T | undefined, clicked: T): T | undefined =>
  current === clicked ? undefined : clicked;

/**
 * Resolve which sort value a column header should link to, and which arrow it
 * shows. Columns carry an `[asc, desc]` pair; clicking an inactive column
 * applies `asc`, clicking the active one flips.
 */
export const resolveSortLink = <S>(
  pair: readonly [S, S],
  activeSort: S
): { next: S; direction: 'asc' | 'desc' | null } => {
  const [asc, desc] = pair;
  if (activeSort === asc) return { next: desc, direction: 'asc' };
  if (activeSort === desc) return { next: asc, direction: 'desc' };
  return { next: asc, direction: null };
};
