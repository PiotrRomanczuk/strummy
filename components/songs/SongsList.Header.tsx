import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { SongsListFilters, SongsListSort } from '@/lib/services/songs-list-queries';

import { buildHref } from './songs-list.helpers';
import { COLUMNS_CLASS, COLUMNS_WITH_ACTION_CLASS } from './songs-row.styles';

const headerCellStyle: CSSProperties = {
  gap: 14,
  padding: '12px 20px',
  borderBottom: '1px solid var(--rule)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '.12em',
  color: 'var(--ink-4)',
};

const thLinkStyle = (active: boolean): CSSProperties => ({
  color: active ? 'var(--gold-2)' : 'inherit',
  textDecoration: 'none',
  cursor: 'pointer',
});

type SortableCol = 'title' | 'author' | 'level' | 'key' | 'added';

/** [ascValue, descValue] for a sortable column — 'added' reuses the existing newest/oldest pills. */
const SORT_PAIRS: Record<SortableCol, [SongsListSort, SongsListSort]> = {
  title: ['title', 'title_desc'],
  author: ['author_asc', 'author_desc'],
  level: ['level_asc', 'level_desc'],
  key: ['key_asc', 'key_desc'],
  added: ['oldest', 'newest'],
};

const SortableTh = ({
  col,
  label,
  filters,
  align,
}: {
  col: SortableCol;
  label: string;
  filters: SongsListFilters;
  align?: 'right' | 'center';
}) => {
  const [asc, desc] = SORT_PAIRS[col];
  const isAsc = filters.sort === asc;
  const isDesc = filters.sort === desc;
  const isActive = isAsc || isDesc;
  const next = isAsc ? desc : asc;

  return (
    <span style={{ textAlign: align }}>
      <Link href={buildHref({ sort: next }, filters)} style={thLinkStyle(isActive)}>
        {label}
        {isActive && <span style={{ marginLeft: 4 }}>{isDesc ? '↓' : '↑'}</span>}
      </Link>
    </span>
  );
};

/** Desktop column headings. The trailing blank cell matches the action column. */
export const SongsListHeaderRow = ({
  t,
  filters,
  hasAction,
}: {
  t: (key: string) => string;
  filters: SongsListFilters;
  hasAction: boolean;
}) => (
  <div
    className={`hidden md:grid ${hasAction ? COLUMNS_WITH_ACTION_CLASS : COLUMNS_CLASS}`}
    style={headerCellStyle}
  >
    <SortableTh col="title" label={t('colTitle')} filters={filters} />
    <SortableTh col="author" label={t('colAuthor')} filters={filters} />
    <SortableTh col="level" label={t('colLevel')} filters={filters} />
    <SortableTh col="key" label={t('colKey')} filters={filters} />
    <span>{t('colLearning')}</span>
    <span>{t('colMastery')}</span>
    <SortableTh col="added" label={t('colAdded')} filters={filters} />
    {hasAction && <span />}
  </div>
);
