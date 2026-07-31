'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { AssignmentListCounts } from '@/lib/services/assignment-list-params';
import type { StudentOption } from '@/lib/services/lesson-form-data';
import {
  FilterBar,
  FilterChipRow,
  FilterControlsRow,
  FilterRow,
  filterControlStyle,
  filterLabelStyle,
  type FilterChip,
} from '@/components/shared/ListFilters';

type ListTab = { key: string; label: string; countKey: keyof AssignmentListCounts };

type Props = {
  counts: AssignmentListCounts;
  activeStatus?: string;
  sort?: string;
  dir: 'asc' | 'desc';
  search?: string;
  students?: StudentOption[];
  studentId?: string;
};

type Translator = ReturnType<typeof useTranslations>;

const buildTabs = (t: Translator): ListTab[] => [
  { key: '', label: t('statusAll'), countKey: 'all' },
  { key: 'not_started', label: t('statusNotStarted'), countKey: 'not_started' },
  { key: 'in_progress', label: t('statusInProgress'), countKey: 'in_progress' },
  { key: 'overdue', label: t('statusOverdue'), countKey: 'overdue' },
  { key: 'completed', label: t('statusCompleted'), countKey: 'completed' },
  { key: 'cancelled', label: t('statusCancelled'), countKey: 'cancelled' },
];

const buildSortOptions = (t: Translator): { value: string; label: string }[] => [
  { value: '', label: t('listSortAttention') },
  { value: 'due_date', label: t('createFormDueDateLabel') },
  { value: 'created_at', label: t('listSortNewest') },
  { value: 'updated_at', label: t('listSortRecentlyUpdated') },
  { value: 'title', label: t('createFormTitleLabel') },
  { value: 'status', label: t('listColStatus') },
];

const selectStyle = filterControlStyle;

// eslint-disable-next-line max-lines-per-function -- list controls (inline styles)
export const AssignmentsListControls = ({
  counts,
  activeStatus,
  sort,
  dir,
  search,
  students,
  studentId,
}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Assignments');
  const tabs = buildTabs(t);
  const sortOptions = buildSortOptions(t);

  const current: Record<string, string | undefined> = {
    status: activeStatus || undefined,
    student: studentId || undefined,
    q: search || undefined,
    sort: sort || undefined,
    dir: sort ? dir : undefined,
  };

  const buildHref = (patch: Record<string, string | null>): string => {
    const merged = { ...current, ...patch };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
    const qs = usp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const push = (patch: Record<string, string | null>) => router.push(buildHref(patch));

  // Live search: filter as the user types (debounced), no Enter required.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      router.replace(buildHref({ q: value.trim() || null }), { scroll: false });
    }, 350);
  };

  const statusChips: FilterChip[] = tabs.map((tab) => ({
    key: tab.key || 'all',
    href: buildHref({ status: tab.key || null }),
    label: tab.label,
    isActive: (activeStatus ?? '') === tab.key,
    count: counts[tab.countKey],
  }));

  return (
    <FilterBar>
      <FilterRow>
        <FilterChipRow chips={statusChips} />
      </FilterRow>

      <FilterControlsRow>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchTimer.current) clearTimeout(searchTimer.current);
            const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
            push({ q: value || null });
          }}
          style={{ display: 'flex', gap: 6 }}
        >
          <input
            name="q"
            defaultValue={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('listSearchPlaceholder')}
            aria-label={t('listSearchAriaLabel')}
            style={{ ...selectStyle, minWidth: 180 }}
          />
        </form>

        {students && students.length > 0 && (
          <select
            aria-label={t('listFilterByStudentAriaLabel')}
            value={studentId ?? ''}
            onChange={(e) => push({ student: e.target.value || null })}
            style={selectStyle}
          >
            <option value="">{t('listAllStudentsOption')}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email ?? t('detailStudentFallback')}
              </option>
            ))}
          </select>
        )}

        <label
          style={{ ...filterLabelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {t('listSortLabel')}
          <select
            aria-label={t('listSortAriaLabel')}
            value={sort ?? ''}
            onChange={(e) =>
              push({ sort: e.target.value || null, dir: e.target.value ? dir : null })
            }
            style={selectStyle}
          >
            {sortOptions.map((o) => (
              <option key={o.value || 'attention'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {sort && (
          <button
            type="button"
            onClick={() => push({ dir: dir === 'asc' ? 'desc' : 'asc' })}
            aria-label={
              dir === 'asc'
                ? t('listSortDirectionAscendingAriaLabel')
                : t('listSortDirectionDescendingAriaLabel')
            }
            style={{ ...selectStyle, cursor: 'pointer' }}
          >
            {dir === 'asc' ? t('listSortAscButton') : t('listSortDescButton')}
          </button>
        )}
      </FilterControlsRow>
    </FilterBar>
  );
};
