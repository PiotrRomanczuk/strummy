import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type {
  AssignmentListCounts,
  AssignmentRow,
  AssignmentTab,
} from '@/lib/services/assignment-list-params';

import { AssignmentTeacherRow } from './AssignmentsList.TeacherRow';

type Props = {
  rows: AssignmentRow[];
  counts: AssignmentListCounts;
  tab: AssignmentTab;
};

const TAB_LABEL: Record<AssignmentTab, string> = {
  open: 'listTabOpen',
  completed: 'listTabCompleted',
  cancelled: 'listTabCancelled',
};

/** The left card: underline tabs over the assignment rows. */
export const AssignmentsBoard = async ({ rows, counts, tab }: Props) => {
  const t = await getTranslations('Assignments');
  const tabCount: Record<AssignmentTab, number> = {
    open: counts.not_started + counts.in_progress + counts.overdue,
    completed: counts.completed,
    cancelled: counts.cancelled,
  };

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 10,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <nav role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--rule)' }}>
        {(Object.keys(TAB_LABEL) as AssignmentTab[]).map((k) => {
          const isActive = k === tab;
          return (
            <Link
              key={k}
              role="tab"
              aria-selected={isActive}
              href={k === 'open' ? '/dashboard/assignments' : `/dashboard/assignments?tab=${k}`}
              style={{
                padding: '14px 22px',
                fontSize: 13,
                color: isActive ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: isActive ? 500 : 400,
                borderBottom: `2px solid ${isActive ? 'var(--gold-2)' : 'transparent'}`,
                marginBottom: -1,
                textDecoration: 'none',
              }}
            >
              {t(TAB_LABEL[k])} · {tabCount[k]}
            </Link>
          );
        })}
      </nav>
      <div>
        {rows.map((row) => (
          <AssignmentTeacherRow key={row.id} row={row} />
        ))}
        {rows.length === 0 && (
          <div
            style={{
              padding: '40px 22px',
              textAlign: 'center',
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
            }}
          >
            {t('listEmptyTab')}
          </div>
        )}
      </div>
    </div>
  );
};
