import { getTranslations } from 'next-intl/server';

import { AssignmentListRow } from '@/components/assignments/AssignmentsList.Row';
import { AssignmentsListHeader } from '@/components/assignments/AssignmentsList.Header';
import { AssignmentsListControls } from '@/components/assignments/list/AssignmentsListControls';
import type { AssignmentListCounts, AssignmentRow } from '@/lib/services/assignment-list-params';
import type { StudentOption } from '@/lib/services/lesson-form-data';

type Props = {
  rows: AssignmentRow[];
  counts: AssignmentListCounts;
  asStudent: boolean;
  canCreate?: boolean;
  activeStatus?: string;
  sort?: string;
  dir: 'asc' | 'desc';
  search?: string;
  students?: StudentOption[];
  studentId?: string;
};

// Teacher/admin get an extra "Progress" column between title and status;
// the student list stays three columns (progress lives in their detail view).
const TEACHER_COLS = 'grid grid-cols-1 md:grid-cols-[150px_1fr_120px_140px]';
const STUDENT_COLS = 'grid grid-cols-1 md:grid-cols-[150px_1fr_140px]';

// eslint-disable-next-line max-lines-per-function -- list shell (inline styles)
export const AssignmentsList = async ({
  rows,
  counts,
  asStudent,
  canCreate,
  activeStatus,
  sort,
  dir,
  search,
  students,
  studentId,
}: Props) => {
  const t = await getTranslations('Assignments');
  const showStudentColumn = !asStudent;
  const colsClass = showStudentColumn ? TEACHER_COLS : STUDENT_COLS;
  const filtered = Boolean(activeStatus || search || studentId);

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
      <AssignmentsListHeader asStudent={asStudent} counts={counts} canCreate={canCreate} />

      <AssignmentsListControls
        counts={counts}
        activeStatus={activeStatus}
        sort={sort}
        dir={dir}
        search={search}
        students={students}
        studentId={studentId}
      />

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
            {filtered
              ? t('listEmptyFiltered')
              : asStudent
                ? t('listEmptyStudent')
                : t('listEmptyTeacher')}
          </div>
        ) : (
          <>
            <div
              className={`hidden md:grid ${colsClass}`}
              style={{
                gap: 14,
                padding: '12px 20px',
                borderBottom: '1px solid var(--rule)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                color: 'var(--ink-4)',
              }}
            >
              <span>{t('listColDue')}</span>
              <span>{showStudentColumn ? t('listColStudentTitle') : t('listColTitle')}</span>
              {showStudentColumn && <span>{t('listColProgress')}</span>}
              <span style={{ textAlign: 'right' }}>{t('listColStatus')}</span>
            </div>
            {rows.map((row, i) => (
              <AssignmentListRow
                key={row.id}
                row={row}
                showStudentColumn={showStudentColumn}
                isLast={i === rows.length - 1}
                colsClass={colsClass}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};
