import { getTranslations } from 'next-intl/server';

import { DataListRow } from '@/components/shared/DataList';
import type { AssignmentRow } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';
import { ChecklistProgress } from '@/components/assignments/checklist/ChecklistProgress';

import { buildHref, type AssignmentsListFilters } from './assignments-list.helpers';

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const Initials = ({ name, email }: { name: string | null; email: string | null }) => {
  const src = (name && name.trim()) || (email && email.trim()) || '?';
  const parts = src.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?')[0];
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--gold-tint), var(--gold-dim))',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--serif)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ink-2)',
        flexShrink: 0,
      }}
    >
      {initials.toUpperCase()}
    </div>
  );
};

const ellipsis: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Teacher-only column: checklist completion as a thin bar + done/total.
 * A dash placeholder keeps the column readable for assignments with no checklist. */
const ProgressCell = ({
  done,
  total,
  noChecklistTitle,
}: {
  done: number;
  total: number;
  noChecklistTitle: string;
}) => {
  if (total === 0) {
    return (
      <span
        style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}
        title={noChecklistTitle}
      >
        —
      </span>
    );
  }
  return <ChecklistProgress done={done} total={total} compact />;
};

type Props = {
  row: AssignmentRow;
  showStudentColumn: boolean;
  /** Grid template, shared with the header so the two cannot drift. */
  template: string;
  filters: AssignmentsListFilters;
};

// eslint-disable-next-line max-lines-per-function -- row (inline styles)
export const AssignmentListRow = async ({ row, showStudentColumn, template, filters }: Props) => {
  const t = await getTranslations('Assignments');
  const colour = assignmentStatusColour(row.effectiveStatus);
  const isOverdue = row.effectiveStatus === 'overdue';
  const isSelected = filters.selected === row.id;
  const student = row.studentName ?? row.studentEmail ?? t('detailStudentFallback');

  // Titles repeat across students ("Practice scales"), so the accessible name
  // pairs the title with whoever it is for — otherwise two rows are
  // indistinguishable to a screen reader and ambiguous to every test.
  const rowLabel = showStudentColumn ? `${row.title} — ${student}` : row.title;

  return (
    <DataListRow
      template={template}
      href={buildHref({ selected: isSelected ? undefined : row.id }, filters)}
      label={rowLabel}
      selected={isSelected}
      mobileMeta={[formatDate(row.dueDate), showStudentColumn ? student : null]
        .filter(Boolean)
        .join(' · ')}
      mobileSplit
      // Phone trail: status and, for staff, checklist progress — what triage
      // needs. The status pill is unscoped, so the block never empties.
      mobileTrail={
        <>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
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
          {showStudentColumn && row.progress.total > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
              {row.progress.done}/{row.progress.total}
            </span>
          )}
        </>
      }
    >
      {/* Desktop-only: on phones the due date rides the mobile meta line. Without
          the class it kept its grid cell at 390px and squeezed the title column
          to nothing, which collapsed the trailing block to zero width. */}
      <div
        className="ui-datalist-desktop"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: isOverdue ? 'var(--danger)' : 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {formatDate(row.dueDate)}
      </div>

      {showStudentColumn ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Initials name={row.studentName} email={row.studentEmail} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, ...ellipsis }}>
              {row.studentName ?? row.studentEmail ?? t('detailStudentFallback')}
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 12,
                color: 'var(--ink-3)',
                ...ellipsis,
              }}
            >
              {row.title}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, ...ellipsis }}>
          {row.title}
        </div>
      )}

      {showStudentColumn && (
        <div className="ui-datalist-desktop ui-datalist-cell-row">
          <ProgressCell
            done={row.progress.done}
            total={row.progress.total}
            noChecklistTitle={t('listNoChecklistTitle')}
          />
        </div>
      )}

      {/* Status has a phone home in `mobileTrail`; this is the wide-layout cell.
          Its alignment is a class, not an inline style: an inline `display`
          beats the stylesheet's `display: none` below 861px, which is how every
          phone row rendered the status pill twice. */}
      <div className="ui-datalist-desktop ui-datalist-cell-end">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
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
    </DataListRow>
  );
};
