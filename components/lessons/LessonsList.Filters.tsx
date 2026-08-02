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
  statusHref,
  sortHref,
  yearHref,
  type LessonsListState,
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
  state,
  years,
}: {
  breakdown: LessonsBreakdown;
  state: LessonsListState;
  years: number[];
}) => {
  const t = await getTranslations('Lessons');

  const statusChips: FilterChip[] = STATUS_KEYS.map((k) => ({
    key: k,
    href: statusHref(state, k),
    label: lessonStatusLabel(k, t),
    isActive: state.statuses.includes(k),
    count: breakdown.byStatus[k] ?? 0,
    icon: <StatusDot status={k} />,
  }));

  const yearChips: FilterChip[] = [
    {
      key: 'all',
      href: yearHref(state, undefined),
      label: t('filterAll'),
      isActive: state.year === undefined,
    },
    ...years.map((y) => ({
      key: String(y),
      href: yearHref(state, y),
      label: String(y),
      isActive: state.year === y,
    })),
  ];

  // sortHref flips whatever it is given, so passing the opposite of the target
  // always lands on the target — including for the already-active chip, which
  // then links to itself.
  const sortChips: FilterChip[] = [
    {
      key: 'newest',
      href: sortHref({ ...state, sort: 'oldest' }),
      label: t('sortNewestFirst'),
      isActive: state.sort === 'newest',
    },
    {
      key: 'oldest',
      href: sortHref({ ...state, sort: 'newest' }),
      label: t('sortOldestFirst'),
      isActive: state.sort === 'oldest',
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
