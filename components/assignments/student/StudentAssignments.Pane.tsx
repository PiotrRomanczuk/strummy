import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LessonStatusPill } from '@/components/lessons/LessonPrimitives';
import { DesignCard, DesignCardBody, DesignCardHeader } from '@/components/shared/DesignCard';
import { getAssignmentDetail, getPracticeWeek } from '@/lib/services/assignment-detail-queries';
import { deriveEffectiveStatus } from '@/lib/services/assignment-list-params';
import { assignmentStatusColour, assignmentStatusLabel } from '@/lib/services/assignments-queries';
import { AssignmentSubmitPanel } from '../detail/AssignmentDetail.SubmitPanel';
import { StudentChordChart } from './StudentAssignments.ChordChart';
import { StudentPracticeLog } from './StudentAssignments.PracticeLog';

/** Right side of the student view: the open assignment's task, practice and hand-in. */
export const StudentAssignmentPane = async ({ assignmentId }: { assignmentId: string }) => {
  const t = await getTranslations('Assignments');
  const a = await getAssignmentDetail(assignmentId);
  if (!a) return null;
  const status = deriveEffectiveStatus(a.dueDate, a.status);
  const days = await getPracticeWeek(a.studentId, a.song?.id ?? null);
  const meta = [
    a.teacherName ? t('studentAssignedBy', { name: a.teacherName }) : null,
    a.dueDate ? `${t('previewDueLabel')} ${a.dueDate.slice(0, 10)}` : null,
    a.dailyTargetMinutes ? t('studentDailyTarget', { minutes: a.dailyTargetMinutes }) : null,
  ].filter(Boolean);

  return (
    <div style={{ padding: '28px 36px 60px', minWidth: 0 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <LessonStatusPill
            label={assignmentStatusLabel(status, t)}
            colour={assignmentStatusColour(status)}
          />
          <Link
            href={`/dashboard/assignments/${a.id}`}
            style={{ fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}
          >
            {t('openFullPage')} →
          </Link>
        </div>
        <h2
          style={{
            margin: '10px 0 4px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 36,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}
        >
          {a.song?.title ?? a.title}
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 14,
            fontSize: 12,
            fontFamily: 'var(--mono)',
            color: 'var(--ink-4)',
            flexWrap: 'wrap',
          }}
        >
          {meta.map((m, i) => (
            <span
              key={i}
              style={{ color: i === 1 && status === 'overdue' ? 'var(--danger)' : undefined }}
            >
              {i > 0 && <span style={{ marginRight: 14 }}>·</span>}
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="ui-student-asg-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <DesignCard>
            <DesignCardHeader eyebrow={t('studentTaskEyebrow')} title={t('studentTaskTitle')} />
            <DesignCardBody
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {a.description ?? (
                <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>
                  {t('detailNoDescription')}
                </span>
              )}
            </DesignCardBody>
          </DesignCard>
          <StudentPracticeLog days={days} dailyTarget={a.dailyTargetMinutes} />
          <DesignCard>
            <DesignCardHeader eyebrow={t('studentSubmitEyebrow')} title={t('studentSubmitTitle')} />
            <DesignCardBody>
              <AssignmentSubmitPanel
                assignment={a}
                canManage={false}
                canAct
                effectiveStatus={status}
              />
            </DesignCardBody>
          </DesignCard>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <StudentChordChart
            chordIds={a.chordDrill?.chord_ids ?? []}
            songChords={a.song?.chords ?? null}
          />
        </div>
      </div>
    </div>
  );
};
