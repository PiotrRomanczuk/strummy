import { getTranslations } from 'next-intl/server';

import { AssignmentsBoard } from '@/components/assignments/AssignmentsList.Board';
import { AssignmentsListHeader } from '@/components/assignments/AssignmentsList.Header';
import { QuickAssign } from '@/components/assignments/list/QuickAssign';
import { StudentAssignmentsList } from '@/components/assignments/student/StudentAssignments.List';
import { StudentAssignmentPane } from '@/components/assignments/student/StudentAssignments.Pane';
import type {
  AssignmentListCounts,
  AssignmentRow,
  AssignmentTab,
} from '@/lib/services/assignment-list-params';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';

type Props = {
  rows: AssignmentRow[];
  counts: AssignmentListCounts;
  asStudent: boolean;
  canCreate?: boolean;
  students?: StudentOption[];
  /** Assignment id open in the student view's right pane, if any. */
  selected?: string;
  /** Teacher board tab. */
  tab?: AssignmentTab;
  /** Song library for the Quick assign card (teachers/admins). */
  songs?: SongOption[];
};

/**
 * Claude Design assignments: teachers get the Open / Completed / Cancelled board
 * beside Quick assign; students get an inbox with the open assignment beside it.
 */
export const AssignmentsList = async ({
  rows,
  counts,
  asStudent,
  canCreate,
  students,
  selected,
  tab,
  songs,
}: Props) => {
  const t = await getTranslations('Assignments');
  if (asStudent) {
    // Claude Design student view: inbox on the left, the open assignment on the right.
    const openId =
      selected ??
      rows.find((r) => r.effectiveStatus !== 'completed' && r.effectiveStatus !== 'cancelled')
        ?.id ??
      rows[0]?.id;
    return (
      <div
        className="ui-student-asg"
        style={{ background: 'var(--ivory)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.4 }}
      >
        <StudentAssignmentsList rows={rows} selectedId={openId} />
        {openId ? (
          <StudentAssignmentPane assignmentId={openId} />
        ) : (
          <div
            style={{
              padding: 40,
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              color: 'var(--ink-4)',
            }}
          >
            {t('studentPickOne')}
          </div>
        )}
      </div>
    );
  }
  return (
    <div
      className="ui-dash-page"
      style={{ background: 'var(--ivory)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.4, minHeight: '100%' }}
    >
      <AssignmentsListHeader asStudent={false} counts={counts} canCreate={canCreate} />
      <div className="ui-asg-split">
        <AssignmentsBoard rows={rows} counts={counts} tab={tab ?? 'open'} />
        {canCreate && students && songs && <QuickAssign students={students} songs={songs} />}
      </div>
    </div>
  );
};
