import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { AssignmentListCounts } from '@/lib/services/assignment-list-params';

type Props = {
  asStudent: boolean;
  counts: AssignmentListCounts;
  canCreate?: boolean;
};

/**
 * Claude Design heading: mono eyebrow, roman 38px title, a counts line
 * ("4 open · 1 overdue · 2 completed") and the dark "+ New assignment" button.
 */
export const AssignmentsListHeader = async ({ asStudent, counts, canCreate }: Props) => {
  const t = await getTranslations('Assignments');
  const open = counts.not_started + counts.in_progress + counts.overdue;

  return (
    <div className="ui-page-head" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
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
          {asStudent ? t('listEyebrowStudent') : t('listEyebrowTeacher')}
        </div>
        <h1
          style={{
            margin: '4px 0 0',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: '-0.02em',
          }}
        >
          {t('listPageTitle')}
        </h1>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
          <strong style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{open}</strong>{' '}
          {t('listSummaryOpen')} ·{' '}
          <span style={{ color: counts.overdue > 0 ? 'var(--danger)' : undefined }}>
            {counts.overdue} {t('listSummaryOverdue')}
          </span>{' '}
          · {counts.completed} {t('listSummaryCompleted')}
        </div>
      </div>
      {canCreate && (
        <Link
          href="/dashboard/assignments/new"
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={12} strokeWidth={1.8} aria-hidden="true" />
          {t('listNewAssignmentButton')}
        </Link>
      )}
    </div>
  );
};
