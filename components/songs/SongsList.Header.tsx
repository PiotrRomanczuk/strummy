import type { DataListColumn } from '@/components/shared/DataList';
import { resolveSortLink } from '@/components/shared/list-href.helpers';
import type { SongsListFilters, SongsListSort } from '@/lib/services/songs-list-queries';

import { buildHref } from './songs-list.helpers';

type SortableCol = 'title' | 'author' | 'level' | 'key' | 'added';

/** [ascValue, descValue] per sortable column — 'added' reuses the existing newest/oldest pills. */
const SORT_PAIRS: Record<SortableCol, readonly [SongsListSort, SongsListSort]> = {
  title: ['title', 'title_desc'],
  author: ['author_asc', 'author_desc'],
  level: ['level_asc', 'level_desc'],
  key: ['key_asc', 'key_desc'],
  added: ['oldest', 'newest'],
};

const sortable = (col: SortableCol, label: string, filters: SongsListFilters): DataListColumn => {
  const { next, direction } = resolveSortLink(SORT_PAIRS[col], filters.sort);
  return { label, sort: { href: buildHref({ sort: next }, filters), direction } };
};

/**
 * Column definitions for the songs list.
 *
 * "Learning" and "Mastery" are deliberately not sortable: both are aggregates
 * computed per page after the query, so a header link would promise an ordering
 * the server cannot deliver.
 */
export const songsColumns = (
  t: (key: string) => string,
  filters: SongsListFilters,
  hasAction: boolean
): DataListColumn[] => {
  const columns: DataListColumn[] = [
    sortable('title', t('colTitle'), filters),
    sortable('author', t('colAuthor'), filters),
    sortable('level', t('colLevel'), filters),
    sortable('key', t('colKey'), filters),
    { label: t('colLearning') },
    { label: t('colMastery') },
    sortable('added', t('colAdded'), filters),
  ];
  // Trailing blank cell keeps the header aligned with the action column.
  if (hasAction) columns.push({ label: '' });
  return columns;
};
