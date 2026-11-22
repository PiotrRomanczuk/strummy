export const LAB_PATH = '/dashboard/admin/lab';
export const SOURCE_GROUPS = ['personal', 'analysis', 'tabs', 'dataset'] as const;

const CELL_LIMIT = 80;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/** One table cell: scalars as text, objects/arrays as compact JSON, everything cut to one line. */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > CELL_LIMIT ? `${text.slice(0, CELL_LIMIT - 1)}…` : text;
}

export type ListParams = Record<string, string | number | string[] | undefined>;

/** Link to a page of the same listing, keeping the query (empty values dropped, lists repeated). */
export function pageHref(basePath: string, params: ListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else if (value !== undefined && value !== '' && !(key === 'page' && value === 1)) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** A repeated search param (`?has=a&has=b`) as a list. */
export function listParam(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

/** Search params arrive as string | string[] | undefined; keep the first, bounded. */
export function firstParam(value: string | string[] | undefined, maxLength = 200): string {
  const text = Array.isArray(value) ? value[0] : value;
  return (text ?? '').slice(0, maxLength);
}

export function pageParam(value: string | string[] | undefined): number {
  const page = Number.parseInt(firstParam(value, 9), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
