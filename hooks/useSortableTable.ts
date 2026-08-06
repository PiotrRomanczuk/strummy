'use client';

import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

type SortValue = string | number | Date | boolean | null | undefined;

interface UseSortableTableOptions<T> {
  getSortValue?: (item: T, key: string) => SortValue;
  initialSortKey?: string;
  initialDirection?: SortDirection;
}

function compareValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date || b instanceof Date) {
    return new Date(a as string | Date).getTime() - new Date(b as string | Date).getTime();
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}

/**
 * Client-side column sorting for an already-fetched list. `getSortValue` lets callers
 * derive a comparable value for keys that aren't a direct property of `T` (nested fields,
 * formatted dates, etc.) — defaults to `item[key]`.
 */
export function useSortableTable<T>(
  items: T[],
  { getSortValue, initialSortKey, initialDirection = 'asc' }: UseSortableTableOptions<T> = {}
) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const resolve = (item: T): SortValue =>
      getSortValue
        ? getSortValue(item, sortKey)
        : ((item as Record<string, unknown>)[sortKey] as SortValue);
    const sorted = [...items].sort((a, b) => compareValues(resolve(a), resolve(b)));
    return direction === 'asc' ? sorted : sorted.reverse();
  }, [items, sortKey, direction, getSortValue]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setDirection('asc');
      return;
    }
    setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return { sortedItems, sortKey, direction, toggleSort };
}
