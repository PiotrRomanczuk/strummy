import { getTranslations } from 'next-intl/server';

import type { AssignmentDetail } from '@/lib/services/assignment-detail-queries';
import { assignmentStatusLabel } from '@/lib/services/assignments-queries';
import type { AssignmentStatus } from '@/schemas/AssignmentSchema';
import { AssignmentStatusActions } from '../status/AssignmentStatusActions';
import { ChecklistView } from '../checklist/ChecklistView';
import { ChordDrillView } from '../chord-drill/ChordDrillView';

type Props = {
  assignment: AssignmentDetail;
  canManage: boolean; // teacher/admin
  canAct: boolean; // owning student or manager — may change status
  effectiveStatus: AssignmentStatus;
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: 'var(--gold-2)',
  marginBottom: 8,
};

/**
 * The "do the work → hand it in" body of the detail Progress card: chord-drill
 * and checklist tick-offs feed a clearly-framed status action. For an owning
 * student this reads as the submit path; a teacher/admin sees a neutral
 * "update status" framing. Media upload + practice-log chart are a later wave.
 */
export const AssignmentSubmitPanel = async ({
  assignment,
  canManage,
  canAct,
  effectiveStatus,
}: Props) => {
  const t = await getTranslations('Assignments');
  const isStudentSubmitter = canAct && !canManage;
  const isTerminal = effectiveStatus === 'completed' || effectiveStatus === 'cancelled';
  const hasWorkItems = Boolean(assignment.chordDrill) || assignment.checklist.length > 0;

  return (
    <>
      {assignment.chordDrill && (
        <div style={{ marginBottom: 18 }}>
          {/* Only the owning student, never a manager: the drill result is
              saved through `student_complete_chord_drill`, which rejects
              anyone but `assignment.student_id`. Offering the CTA to a teacher
              sent them through the whole quiz only to fail at the save. */}
          <ChordDrillView
            assignmentId={assignment.id}
            drill={assignment.chordDrill}
            result={assignment.chordDrillResult}
            canAct={isStudentSubmitter}
          />
        </div>
      )}
      {assignment.checklist.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <ChecklistView
            assignmentId={assignment.id}
            items={assignment.checklist}
            canToggle={canAct}
          />
        </div>
      )}

      {canAct ? (
        <div
          style={{
            borderTop: hasWorkItems ? '1px solid var(--rule)' : 'none',
            paddingTop: hasWorkItems ? 16 : 0,
          }}
        >
          <div style={eyebrowStyle}>
            {isStudentSubmitter ? t('detailHandItInLabel') : t('detailUpdateStatusLabel')}
          </div>
          {/* Drop the hand-in instruction once the work is handed in — it used to
              sit directly above "No further actions", telling the student to do
              something they'd already done. */}
          {isStudentSubmitter && !isTerminal && (
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--ink-3)',
              }}
            >
              {t('detailHandItInHint')}
            </p>
          )}
          <AssignmentStatusActions
            assignmentId={assignment.id}
            currentStatus={assignment.status as AssignmentStatus}
            canManage={canManage}
          />
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {t('detailStatusPrefix')} {assignmentStatusLabel(effectiveStatus, t)}
        </div>
      )}
    </>
  );
};
