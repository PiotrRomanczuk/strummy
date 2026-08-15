import { getTranslations } from 'next-intl/server';

import { DataList, type DataListColumn } from '@/components/shared/DataList';
import { ListPagination } from '@/components/shared/ListPagination';
import { AssignmentListRow } from '@/components/assignments/AssignmentsList.Row';
import { AssignmentsListHeader } from '@/components/assignments/AssignmentsList.Header';
import { AssignmentsListPanel } from '@/components/assignments/AssignmentsList.Panel';
import { AssignmentsListControls } from '@/components/assignments/list/AssignmentsListControls';
import type { AssignmentListCounts, AssignmentRow } from '@/lib/services/assignment-list-params';
import type { StudentOption } from '@/lib/services/lesson-form-data';

import { buildHref, sortColumnLink, type AssignmentsListFilters } from './assignments-list.helpers';

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
  /** 1-based page, clamped by the query layer. */
  page: number;
  totalPages: number;
  /** Assignment id shown in the slide-in detail panel, if any. */
  selected?: string;
};

// Teacher/admin get an extra "Progress" column between title and status; the
// student list stays three columns (progress lives in their detail view).
// Fed to DataList as `--cols`, not as a Tailwind class — Tailwind's scanner
// only sees class names written literally in source.
const TEACHER_TEMPLATE = '150px 1fr 120px 140px';
const STUDENT_TEMPLATE = '150px 1fr 140px';

/**
 * Due, Title and Status are sortable; Progress is not — it is a per-row
 * checklist tally with no server-side ordering behind it.
 */
const assignmentColumns = (
  showStudentColumn: boolean,
  filters: AssignmentsListFilters,
  t: (key: string) => string
): DataListColumn[] => {
  const cols: DataListColumn[] = [
    { label: t('listColDue'), sort: sortColumnLink('due_date', filters) },
    {
      label: showStudentColumn ? t('listColStudentTitle') : t('listColTitle'),
      sort: sortColumnLink('title', filters),
    },
  ];
  if (showStudentColumn) cols.push({ label: t('listColProgress') });
  cols.push({ label: t('listColStatus'), align: 'right', sort: sortColumnLink('status', filters) });
  return cols;
};

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
  page,
  totalPages,
  selected,
}: Props) => {
  const t = await getTranslations('Assignments');
  const showStudentColumn = !asStudent;
  const template = showStudentColumn ? TEACHER_TEMPLATE : STUDENT_TEMPLATE;
  const filtered = Boolean(activeStatus || search || studentId);
  const filters: AssignmentsListFilters = {
    status: activeStatus,
    studentId,
    search,
    sort: sort as AssignmentsListFilters['sort'],
    dir,
    page,
    selected,
  };
  const selectedRow = selected ? (rows.find((r) => r.id === selected) ?? null) : null;

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

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DataList
            columns={assignmentColumns(showStudentColumn, filters, t)}
            template={template}
            empty={
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
            }
          >
            {rows.map((row) => (
              <AssignmentListRow
                key={row.id}
                row={row}
                showStudentColumn={showStudentColumn}
                template={template}
                filters={filters}
              />
            ))}
          </DataList>

          <ListPagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => buildHref({ page: p }, filters)}
            labels={{
              prev: t('pagerPrev'),
              next: t('pagerNext'),
              status: t('pagerStatus', { page, total: totalPages }),
            }}
          />
        </div>
        {selectedRow && (
          <AssignmentsListPanel
            row={selectedRow}
            filters={filters}
            showStudent={showStudentColumn}
          />
        )}
      </div>
    </div>
  );
};
