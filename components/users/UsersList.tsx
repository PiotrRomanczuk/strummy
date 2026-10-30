import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import type { UserListRow, UserListFilters } from '@/lib/services/users-list-queries';
import { InviteTeacherButton } from './InviteTeacherButton';
import { UsersListFiltersForm } from './UsersList.FiltersForm';
import { UsersListRow } from './UsersList.Row';
import type { StudentActivity } from '@/lib/services/user-activity-queries';

const rolesFor = (r: UserListRow, tRoles: (key: string) => string): string => {
  const roles: string[] = [];
  if (r.isAdmin) roles.push(tRoles('admin'));
  if (r.isTeacher) roles.push(tRoles('teacher'));
  if (r.isStudent) roles.push(tRoles('student'));
  return roles.join(' · ') || tRoles('noRole');
};

type Props = {
  rows: UserListRow[];
  filters: UserListFilters;
  canEdit: boolean;
  /** Repertoire size / practice recency per student id. */
  activity?: Map<string, StudentActivity>;
};

export const UsersList = async ({ rows, filters, canEdit, activity }: Props) => {
  const [t, tRoles, locale] = await Promise.all([
    getTranslations('Users'),
    getTranslations('Roles'),
    getLocale(),
  ]);

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <div className="ui-page-head" style={{ marginBottom: 18 }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '.16em',
            }}
          >
            {t('listEyebrow')}
          </div>
          <h1
            style={{
              margin: '4px 0 6px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 40,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
            }}
          >
            {t('listTitle')}
          </h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            {t('listCountShown', { count: rows.length })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <InviteTeacherButton />}
          <Link
            href="/dashboard/users/new"
            className="ui-chip"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--sans)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('listNewStudentButton')}
          </Link>
        </div>
      </div>

      <UsersListFiltersForm filters={filters} />

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              fontSize: 15,
            }}
          >
            {t('listEmptyState')}
          </div>
        ) : (
          rows.map((r) => (
            <UsersListRow
              key={r.id}
              r={r}
              activity={activity?.get(r.id)}
              roles={rolesFor(r, tRoles)}
              canEdit={canEdit}
              locale={locale}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
};
