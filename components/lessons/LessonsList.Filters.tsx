import { getTranslations } from 'next-intl/server';

import type { LessonsBreakdown } from '@/lib/services/lessons-queries';
import { lessonStatusColour, lessonStatusLabel } from '@/lib/services/lessons-queries';
import {
  FilterBar,
  FilterChipRow,
  FilterRow,
  type FilterChip,
} from '@/components/shared/ListFilters';

import {
  STATUS_KEYS,
  buildHref,
  toggleStatus,
  type LessonsListFilters,
} from './lessons-list.helpers';

/** Kept exported: other lesson surfaces reuse this label style. */
export const eyebrowStyle = {
  fontSize: 11,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontFamily: 'var(--mono)',
  marginRight: 4,
} as const;

const StatusDot = ({ status }: { status: string }) => (
  <span
    style={{ width: 6, height: 6, borderRadius: '50%', background: lessonStatusColour(status) }}
  />
);

/**
 * Lessons filter bar, on the shared primitive.
 *
 * Previously this file carried its own chip style, its own label style and a
 * one-off sort *toggle* — a single link whose label changed — while every
 * other list used a chip row. Sort is now two chips like everywhere else, so
 * the current sort is visible rather than inferred from what the button says.
 *
 * Renamed from `FilterRow`, which collided with the shared component of that
 * name (rule S3: one exported name, one definition).
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

  const statusChips: FilterChip[] = STATUS_KEYS.map((k) => ({
    key: k,
    href: buildHref({ statuses: toggleStatus(filters.statuses, k) }, filters),
    label: lessonStatusLabel(k, t),
    isActive: filters.statuses.includes(k),
    count: breakdown.byStatus[k] ?? 0,
    icon: <StatusDot status={k} />,
  }));

  const yearChips: FilterChip[] = [
    {
      key: 'all',
      href: buildHref({ year: undefined }, filters),
      label: t('filterAll'),
      isActive: filters.year === undefined,
    },
    ...years.map((y) => ({
      key: String(y),
      href: buildHref({ year: y }, filters),
      label: String(y),
      isActive: filters.year === y,
    })),
  ];

  // Both chips name the sort they apply, so each links straight at its own
  // value. Either one enters flat mode — the grouped view has no global order.
  const sortChips: FilterChip[] = [
    {
      key: 'newest',
      href: buildHref({ sort: 'newest', flat: true }, filters),
      label: t('sortNewestFirst'),
      isActive: filters.flat && filters.sort === 'newest',
    },
    {
      key: 'oldest',
      href: buildHref({ sort: 'oldest', flat: true }, filters),
      label: t('sortOldestFirst'),
      isActive: filters.flat && filters.sort === 'oldest',
    },
  ];

  return (
    <FilterBar>
      <FilterRow>
        <FilterChipRow label={t('colStatus')} chips={statusChips} />
      </FilterRow>
      <FilterRow>
        <FilterChipRow label={t('filterYear')} chips={yearChips} />
        <FilterChipRow align="end" chips={sortChips} />
      </FilterRow>
    </FilterBar>
  );
};
