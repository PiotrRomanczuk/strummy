'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { UserListFilters } from '@/lib/services/users-list-queries';

const controlStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--ink)',
};

type Props = {
  filters: UserListFilters;
};

const buildHref = (filters: UserListFilters, next: Partial<UserListFilters>): string => {
  const merged = { ...filters, ...next };
  const params = new URLSearchParams();
  if (merged.search) params.set('search', merged.search);
  if (merged.role) params.set('role', merged.role);
  if (merged.active) params.set('active', merged.active);
  if (merged.studentStatus) params.set('studentStatus', merged.studentStatus);
  const qs = params.toString();
  return qs ? `/dashboard/users?${qs}` : '/dashboard/users';
};

/** People filters that apply live — selects push immediately, search debounces. */
export const UsersListFiltersForm = ({ filters }: Props) => {
  const t = useTranslations('Users');
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (next: Partial<UserListFilters>) =>
    router.push(buildHref(filters, next), { scroll: false });

  const applyDebounced = (next: Partial<UserListFilters>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(buildHref(filters, next), { scroll: false });
    }, 350);
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}
    >
      <input
        name="search"
        defaultValue={filters.search ?? ''}
        placeholder={t('filterSearchPlaceholder')}
        aria-label={t('filterSearchAriaLabel')}
        onChange={(e) => applyDebounced({ search: e.target.value.trim() || undefined })}
        style={{ ...controlStyle, fontFamily: 'var(--sans)', minWidth: 220 }}
      />
      <select
        name="role"
        aria-label={t('filterRoleAriaLabel')}
        defaultValue={filters.role ?? ''}
        onChange={(e) => apply({ role: (e.target.value || undefined) as UserListFilters['role'] })}
        style={controlStyle}
      >
        <option value="">{t('filterAllRolesOption')}</option>
        <option value="student">{t('filterStudentsOption')}</option>
        <option value="teacher">{t('filterTeachersOption')}</option>
        <option value="admin">{t('filterAdminsOption')}</option>
        <option value="shadow">{t('filterUnclaimedOption')}</option>
      </select>
      <select
        name="active"
        aria-label={t('filterActiveStateAriaLabel')}
        defaultValue={filters.active ?? ''}
        onChange={(e) =>
          apply({ active: (e.target.value || undefined) as UserListFilters['active'] })
        }
        style={controlStyle}
      >
        <option value="">{t('filterActiveOption')}</option>
        <option value="false">{t('filterDeactivatedOption')}</option>
      </select>
      <select
        name="studentStatus"
        aria-label={t('filterStudentStatusAriaLabel')}
        defaultValue={filters.studentStatus ?? ''}
        onChange={(e) =>
          apply({
            studentStatus: (e.target.value || undefined) as UserListFilters['studentStatus'],
          })
        }
        style={controlStyle}
      >
        <option value="">{t('filterAllStudentStatusesOption')}</option>
        <option value="active">{t('filterActiveOption')}</option>
        <option value="archived">{t('filterArchivedOption')}</option>
      </select>
    </form>
  );
};
