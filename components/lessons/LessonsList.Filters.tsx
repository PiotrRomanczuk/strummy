import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { LessonsBreakdown } from '@/lib/services/lessons-queries';
import { lessonStatusColour, lessonStatusLabel } from '@/lib/services/lessons-queries';
import {
  FilterChipRow,
  FilterControlsRow,
  filterLabelStyle,
  type FilterChip,
} from '@/components/shared/ListFilters';

import { LessonsYearSelect } from './LessonsList.YearSelect';
import {
  STATUS_KEYS,
  buildHref,
  toggleStatus,
  type LessonsListFilters,
} from './lessons-list.helpers';

/** Kept exported: other lesson surfaces reuse this label style. */
export const eyebrowStyle = { ...filterLabelStyle, marginRight: 4 } as const;

const StatusDot = ({ status }: { status: string }) => (
  <span
    style={{ width: 6, height: 6, borderRadius: '50%', background: lessonStatusColour(status) }}
  />
);

const Divider = () => (
  <span
    aria-hidden="true"
    style={{ width: 1, height: 20, background: 'var(--rule)', margin: '0 6px' }}
  />
);

/**
 * Claude Design lesson filter row — one card: status chips · year select ·
 * the sort toggle pushed right.
 */
export const LessonsFilterBar = async ({
  breakdown,
  filters,
  years,
}: {
  breakdown: LessonsBreakdown;
  filters: LessonsListFilters;
  years: number[];
}) => {
  const t = await getTranslations('Lessons');

  // No status param means every status is on, as in the mockup — so toggling a
  // chip from that state switches just that one off.
  const activeStatuses = filters.statuses.length > 0 ? filters.statuses : [...STATUS_KEYS];
  const statusChips: FilterChip[] = STATUS_KEYS.map((k) => ({
    key: k,
    href: buildHref({ statuses: toggleStatus(activeStatuses, k) }, filters),
    label: lessonStatusLabel(k, t),
    isActive: activeStatuses.includes(k),
    count: breakdown.byStatus[k] ?? 0,
    icon: <StatusDot status={k} />,
    color: lessonStatusColour(k),
  }));

  const yearOptions = [
    { value: '', label: t('filterAll'), href: buildHref({ year: undefined }, filters) },
    ...years.map((y) => ({
      value: String(y),
      label: String(y),
      href: buildHref({ year: y }, filters),
    })),
  ];
  const nextSort = filters.sort === 'oldest' ? 'newest' : 'oldest';

  return (
    <FilterControlsRow>
      <FilterChipRow label={t('colStatus')} chips={statusChips} />
      <Divider />
      <span style={filterLabelStyle}>{t('filterYear')}</span>
      <LessonsYearSelect
        value={filters.year !== undefined ? String(filters.year) : ''}
        options={yearOptions}
        label={t('filterYear')}
      />
      <Link
        href={buildHref({ sort: nextSort, flat: true }, filters)}
        className="ui-chip"
        style={{
          marginLeft: 'auto',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          color: 'var(--ink-2)',
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          textDecoration: 'none',
        }}
      >
        <ArrowUpDown size={12} strokeWidth={1.6} aria-hidden="true" />
        {filters.sort === 'oldest' ? t('sortOldestFirst') : t('sortNewestFirst')}
      </Link>
    </FilterControlsRow>
  );
};
