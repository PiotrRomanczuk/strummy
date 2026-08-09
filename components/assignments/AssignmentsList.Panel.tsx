import { getTranslations } from 'next-intl/server';

import { ListDetailPanel } from '@/components/shared/ListDetailPanel';
import type { AssignmentRow } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';

import { buildHref, type AssignmentsListFilters } from './assignments-list.helpers';

type Props = {
  row: AssignmentRow;
  filters: AssignmentsListFilters;
  /** Teacher/admin view — students already know whose assignment it is. */
  showStudent: boolean;
};

const factLabel = {
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  color: 'var(--ink-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '.12em',
};

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={factLabel}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3 }}>{value}</div>
  </div>
);

/**
 * Slide-in assignment detail — a lighter view of
 * `/dashboard/assignments/[id]`, so a teacher triaging the list can see what is
 * due and how far along it is without losing their filter and page.
 *
 * Everything here comes from the row the list already holds; unlike the lessons
 * panel there is no extra query, because `AssignmentRow` already carries the
 * checklist tally.
 */
export const AssignmentsListPanel = async ({ row, filters, showStudent }: Props) => {
  const t = await getTranslations('Assignments');
  const colour = assignmentStatusColour(row.effectiveStatus);
  const { done, total } = row.progress;

  return (
    <ListDetailPanel
      label={t('panelLabel', { title: row.title })}
      eyebrow={t('panelEyebrow')}
      fullPageHref={`/dashboard/assignments/${row.id}`}
      closeHref={buildHref({ selected: undefined }, filters)}
      labels={{ openFullPage: t('openFullPage'), close: t('closePanel') }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
          }}
        >
          {row.title}
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            padding: '3px 10px',
            borderRadius: 4,
            background: 'rgba(0,0,0,.03)',
            color: colour,
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontFamily: 'var(--mono)',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: colour }} />
          {assignmentStatusLabel(row.effectiveStatus, t)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          paddingBottom: 16,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Fact label={t('listColDue')} value={formatDate(row.dueDate)} />
        <Fact
          label={t('listColProgress')}
          value={total === 0 ? t('listNoChecklistTitle') : `${done}/${total}`}
        />
      </div>

      {showStudent && (
        <div style={{ paddingTop: 16 }}>
          <div style={factLabel}>{t('listColStudentTitle')}</div>
          <div style={{ fontSize: 13, marginTop: 3 }}>
            {row.studentName ?? row.studentEmail ?? t('detailStudentFallback')}
          </div>
        </div>
      )}
    </ListDetailPanel>
  );
};
