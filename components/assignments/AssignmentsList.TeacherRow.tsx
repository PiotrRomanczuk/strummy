import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LessonStatusPill, StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { AssignmentRow } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';

import { assignmentProgressPct, dueShort, relativeDays } from './assignment-row.helpers';

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

/** One Claude Design assignment row: who · what, brief, progress, due, status. */
export const AssignmentTeacherRow = async ({ row }: { row: AssignmentRow }) => {
  const t = await getTranslations('Assignments');
  const pct = assignmentProgressPct(row);
  const due = dueShort(row.dueDate);
  const isOverdue = row.effectiveStatus === 'overdue';
  const firstName = (row.studentName ?? row.studentEmail ?? '').split(/\s+/)[0];

  return (
    <Link
      href={`/dashboard/assignments/${row.id}`}
      className="ui-row ui-asg-row"
      aria-label={`${firstName} · ${row.songTitle ?? row.title}`}
      style={{ borderBottom: '1px solid var(--rule)', color: 'inherit', textDecoration: 'none' }}
    >
      <StudentInitials
        name={row.studentName}
        email={row.studentEmail}
        color={row.studentColor}
        size={32}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2, minWidth: 0 }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{firstName}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>·</span>
          <span
            style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, ...ellipsis }}
          >
            {row.songTitle ?? row.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', ...ellipsis }}>
          {row.description?.split('\n')[0] || (row.songTitle ? row.title : '')}
        </div>
      </div>
      <div className="ui-asg-desktop">
        <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: pct >= 100 ? 'var(--success)' : 'var(--gold-2)',
            }}
          />
        </div>
        <div
          style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}
        >
          {pct}% · {t('listRowUpdated', { when: relativeDays(row.updatedAt) })}
        </div>
      </div>
      <div
        className="ui-asg-desktop"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: isOverdue ? 'var(--danger)' : 'var(--ink-3)',
        }}
      >
        {due ? `${t('previewDueLabel')} ${due}` : '—'}
      </div>
      <div>
        <LessonStatusPill
          label={assignmentStatusLabel(row.effectiveStatus, t)}
          colour={assignmentStatusColour(row.effectiveStatus)}
        />
      </div>
    </Link>
  );
};
