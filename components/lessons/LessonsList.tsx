import { getTranslations } from 'next-intl/server';

import { DataList, type DataListColumn } from '@/components/shared/DataList';
import { ListPagination } from '@/components/shared/ListPagination';
import type { LessonRow, LessonsBreakdown } from '@/lib/services/lessons-queries';

import { LessonsListHeader } from './LessonsList.Header';
import { LessonsListMobile } from './LessonsList.Mobile';
import { LessonsListPanel } from './LessonsList.Panel';
import { LessonRowItem } from './LessonsList.Row';
import {
  buildHref,
  sortColumnLink,
  type LessonsListFilters,
  type LessonsSort,
} from './lessons-list.helpers';

type Props = {
  lessons: LessonRow[];
  breakdown: LessonsBreakdown;
  canCreate: boolean;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  activeStatuses: string[];
  activeSort: LessonsSort;
  activeYear?: number;
  /** True once a `sort=` param is present — renders a flat sorted table. */
  flat: boolean;
  /** 1-based current page. */
  activePage?: number;
  /** Total pages for the active filter; 1 hides the pager. */
  pageCount?: number;
  /** Years offered in the filter row. */
  years: number[];
  /** Lesson id shown in the slide-in detail panel, if any. */
  selected?: string;
};

const emptyMessage = (
  showTeacher: boolean,
  showStudent: boolean,
  t: (key: string) => string
): string =>
  showTeacher && showStudent
    ? t('emptyAllTeachers')
    : showStudent
      ? t('emptyTeacher')
      : t('emptyStudent');

/**
 * Grid template fed to DataList as the `--cols` custom property rather than a
 * Tailwind class: Tailwind's scanner only sees class names written literally in
 * source, so a template picked at runtime must not be a class.
 *
 * Claude Design order: Date · Lesson · [Student] · [Teacher] · Songs · Time · Status · ›
 */
const columnTemplate = (showStudent: boolean, showTeacher: boolean): string =>
  `88px minmax(160px, 2.3fr) ${showStudent ? 'minmax(120px, 1.3fr) ' : ''}${
    showTeacher ? 'minmax(120px, 1.3fr) ' : ''
  }1fr 110px 120px 60px`;

/**
 * Column definitions. Date, Title and Status are sortable — they map to real
 * `lessons` columns. Student and Teacher are not: those names live on a joined
 * profile, so the query cannot order by them, and Songs is a per-row count.
 */
const lessonColumns = (
  showStudentColumn: boolean,
  showTeacherColumn: boolean,
  filters: LessonsListFilters,
  t: (key: string) => string
): DataListColumn[] => {
  const cols: DataListColumn[] = [{ label: t('colDate'), sort: sortColumnLink('date', filters) }];
  cols.push({ label: t('colLesson'), sort: sortColumnLink('title', filters) });
  if (showStudentColumn) cols.push({ label: t('colStudent') });
  if (showTeacherColumn) cols.push({ label: t('colTeacher') });
  cols.push({ label: t('colSongs') });
  cols.push({ label: t('colTime') });
  cols.push({ label: t('colStatus'), sort: sortColumnLink('status', filters) });
  cols.push({ label: '' });
  return cols;
};

const EmptyState = ({ message }: { message: string }) => (
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
    {message}
  </div>
);

const ListBody = ({
  lessons,
  showStudentColumn,
  showTeacherColumn,
  template,
  filters,
}: {
  lessons: LessonRow[];
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  template: string;
  filters: LessonsListFilters;
}) => (
  <>
    {lessons.map((l) => (
      <LessonRowItem
        key={l.id}
        lesson={l}
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        template={template}
        filters={filters}
      />
    ))}
  </>
);

export const LessonsList = async ({
  lessons,
  breakdown,
  canCreate,
  showStudentColumn,
  showTeacherColumn,
  activeStatuses,
  activeSort,
  activeYear,
  flat,
  years,
  activePage = 1,
  pageCount = 1,
  selected,
}: Props) => {
  const t = await getTranslations('Lessons');
  const template = columnTemplate(showStudentColumn, showTeacherColumn);
  const filters: LessonsListFilters = {
    statuses: activeStatuses,
    sort: activeSort,
    year: activeYear,
    flat,
    page: activePage,
    selected,
  };
  const selectedLesson = selected ? (lessons.find((l) => l.id === selected) ?? null) : null;
  // `breakdown` covers every status; narrow it to the active chips so the header
  // reports what the filter actually matches, not just the rows that fit the cap.
  const matchingCount =
    activeStatuses.length > 0
      ? activeStatuses.reduce((sum, s) => sum + (breakdown.byStatus[s] ?? 0), 0)
      : breakdown.total;

  return (
    <div
      className="ui-dash-page"
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        fontSize: 13,
        lineHeight: 1.4,
        minHeight: '100%',
      }}
    >
      <div className="md:hidden">
        <LessonsListMobile
          lessons={lessons}
          count={matchingCount}
          canCreate={canCreate}
          showStudent={showStudentColumn}
          filters={filters}
        />
        {lessons.length === 0 && (
          <EmptyState message={emptyMessage(showTeacherColumn, showStudentColumn, t)} />
        )}
        <ListPagination
          page={activePage}
          totalPages={pageCount}
          hrefForPage={(p) => buildHref({ page: p }, filters)}
          labels={{
            prev: t('newer'),
            next: t('older'),
            status: t('pageOf', { page: activePage, count: pageCount }),
          }}
        />
      </div>
      <div className="hidden md:block">
        <LessonsListHeader
          count={matchingCount}
          canCreate={canCreate}
          showStudentColumn={showStudentColumn}
          showTeacherColumn={showTeacherColumn}
          breakdown={breakdown}
          filters={filters}
          years={years}
        />
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DataList
              columns={lessonColumns(showStudentColumn, showTeacherColumn, filters, t)}
              template={template}
              empty={<EmptyState message={emptyMessage(showTeacherColumn, showStudentColumn, t)} />}
            >
              {lessons.length > 0 ? (
                <ListBody
                  lessons={lessons}
                  showStudentColumn={showStudentColumn}
                  showTeacherColumn={showTeacherColumn}
                  template={template}
                  filters={filters}
                />
              ) : null}
            </DataList>
            <ListPagination
              page={activePage}
              totalPages={pageCount}
              hrefForPage={(p) => buildHref({ page: p }, filters)}
              labels={{
                prev: t('newer'),
                next: t('older'),
                status: t('pageOf', { page: activePage, count: pageCount }),
              }}
            />
          </div>
          {selectedLesson && (
            <LessonsListPanel
              lesson={selectedLesson}
              filters={filters}
              showStudent={showStudentColumn}
            />
          )}
        </div>
      </div>
    </div>
  );
};
