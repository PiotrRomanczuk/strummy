import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LessonStatusPill } from '@/components/lessons/LessonPrimitives';
import type { AssignmentRow } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';
import { assignmentProgressPct, dueShort } from '../assignment-row.helpers';

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

/** Left rail of the student view: "From your teacher" + one card per assignment. */
export const StudentAssignmentsList = async ({
  rows,
  selectedId,
}: {
  rows: AssignmentRow[];
  selectedId?: string;
}) => {
  const t = await getTranslations('Assignments');
  const active = rows.filter(
    (r) => r.effectiveStatus !== 'completed' && r.effectiveStatus !== 'cancelled'
  ).length;

  return (
    <aside className="ui-student-asg-list">
      <div style={{ padding: '22px 22px 14px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {t('listEyebrowStudent')}
        </div>
        <h1
          style={{
            margin: '4px 0 6px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: '-0.02em',
          }}
        >
          {t('listPageTitle')}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {t('studentActiveCount', { count: active })}
        </div>
      </div>
      {rows.length === 0 && (
        <div
          style={{
            padding: '24px 22px',
            fontStyle: 'italic',
            fontFamily: 'var(--serif)',
            color: 'var(--ink-4)',
            borderTop: '1px solid var(--rule)',
          }}
        >
          {t('listEmptyStudent')}
        </div>
      )}
      {rows.map((r) => {
        const isOpen = r.id === selectedId;
        const pct = assignmentProgressPct(r);
        const isDone = r.effectiveStatus === 'completed';
        return (
          <Link
            key={r.id}
            href={`/dashboard/assignments?selected=${r.id}`}
            aria-current={isOpen ? 'true' : undefined}
            className="ui-row"
            style={{
              display: 'block',
              padding: '14px 22px',
              borderTop: '1px solid var(--rule)',
              background: isOpen ? 'var(--card)' : 'transparent',
              position: 'relative',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {isOpen && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: 'var(--gold-2)',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <LessonStatusPill
                label={assignmentStatusLabel(r.effectiveStatus, t)}
                colour={assignmentStatusColour(r.effectiveStatus)}
              />
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  marginLeft: 'auto',
                  color: r.effectiveStatus === 'overdue' ? 'var(--danger)' : 'var(--ink-4)',
                }}
              >
                {isDone
                  ? '✓'
                  : dueShort(r.dueDate)
                    ? `${t('previewDueLabel')} ${dueShort(r.dueDate)}`
                    : ''}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 15,
                fontWeight: 500,
                marginBottom: 2,
                ...ellipsis,
              }}
            >
              {r.songTitle ?? r.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', ...ellipsis }}>
              {r.description?.split('\n')[0] ?? ''}
            </div>
            <div
              style={{
                marginTop: 8,
                height: 3,
                background: 'var(--rule)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: pct >= 100 ? 'var(--success)' : 'var(--gold-2)',
                }}
              />
            </div>
          </Link>
        );
      })}
    </aside>
  );
};
