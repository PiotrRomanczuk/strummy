/**
 * URL-param helpers shared by every list filter bar.
 *
 * Songs, Lessons, Assignments and Users each had their own href builder or
 * router push, so "changing a filter resets pagination" was re-decided per
 * page — and Assignments/Users used a client router while Songs/Lessons used
 * plain links, meaning the same interaction behaved differently depending on
 * which list you were looking at.
 */

/** A filter value that has been applied, or `undefined` for "not set". */
export type FilterValue = string | number | undefined;

export type BuildHrefOptions = {
  /** Route the filters live on, e.g. `/dashboard/repertoire`. */
  basePath: string;
  /** Currently applied params. */
  current: Record<string, FilterValue>;
  /** Overrides to apply. A key set to `undefined` clears that filter. */
  next: Record<string, FilterValue>;
  /**
   * Values that are the default and so stay out of the URL, keeping hrefs
   * short and making "no filters" a clean bare path.
   */
  defaults?: Record<string, FilterValue>;
};

/**
 * Build a filtered href.
 *
 * Changing anything other than `page` resets pagination to 1 — landing on
 * page 4 of a result set that now has one page is the bug this prevents, and
 * it was previously implemented (or forgotten) per page.
 */
export const buildListHref = ({
  basePath,
  current,
  next,
  defaults = {},
}: BuildHrefOptions): string => {
  const merged = { ...current, ...next };
  const resetsPage = !('page' in next);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (key === 'page') continue;
    if (value === undefined || value === '') continue;
    if (defaults[key] !== undefined && String(defaults[key]) === String(value)) continue;
    params.set(key, String(value));
  }

  const page = resetsPage ? 1 : Number(merged.page ?? 1);
  if (page > 1) params.set('page', String(page));

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

/** Read a single search param, collapsing Next's `string | string[]` shape. */
export const readParam = (value: string | string[] | undefined): string | undefined =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

/** Read a param constrained to a known set, falling back when it does not match. */
export const readEnumParam = <T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  const raw = readParam(value)?.toLowerCase();
  return allowed.includes(raw as T) ? (raw as T) : fallback;
};
