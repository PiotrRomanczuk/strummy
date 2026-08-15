import { getTranslations } from 'next-intl/server';

import { DataList, type DataListColumn } from '@/components/shared/DataList';
import { ListPagination } from '@/components/shared/ListPagination';
import type { LessonRow, LessonsBreakdown } from '@/lib/services/lessons-queries';

import { groupLessonsByTime } from './lesson-grouping.helpers';
import { LessonsListHeader } from './LessonsList.Header';
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
  showTeacher ? t('emptyAllTeachers') : showStudent ? t('emptyTeacher') : t('emptyStudent');

/**
 * Grid template fed to DataList as the `--cols` custom property rather than a
 * Tailwind class: Tailwind's scanner only sees class names written literally in
 * source, so a template picked at runtime must not be a class.
 *
 * Date · [Student] · [Teacher] · Title · Songs · Time · Status
 */
const columnTemplate = (showStudent: boolean, showTeacher: boolean): string => {
  if (showStudent && showTeacher) return '130px 140px 130px 1fr 136px 84px 110px';
  if (showStudent) return '140px 150px 1fr 136px 84px 110px';
  return '150px 1fr 136px 84px 110px';
};

const SectionHeader = ({ label, count }: { label: string; count: number }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 20px',
      background: 'var(--paper)',
      borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: 'var(--ink-4)',
    }}
  >
    <span style={{ color: 'var(--ink-2)' }}>{label}</span>
    <span>·</span>
    <span>{count}</span>
  </div>
);

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
  if (showStudentColumn) cols.push({ label: t('colStudent') });
  if (showTeacherColumn) cols.push({ label: t('colTeacher') });
  cols.push({ label: t('colTitle'), sort: sortColumnLink('title', filters) });
  cols.push({ label: t('colSongs') });
  cols.push({ label: t('colTime') });
  cols.push({ label: t('colStatus'), align: 'right', sort: sortColumnLink('status', filters) });
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
}) => {
  const renderRows = (items: LessonRow[]) =>
    items.map((l) => (
      <LessonRowItem
        key={l.id}
        lesson={l}
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        template={template}
        filters={filters}
      />
    ));

  // Grouped view keeps its time-bucket headers; a column sort flattens the list,
  // because a grouped list cannot honour a global ordering.
  return filters.flat ? (
    <>{renderRows(lessons)}</>
  ) : (
    <>
      {groupLessonsByTime(lessons, new Date()).map((group) => (
        <div key={group.key}>
          <SectionHeader label={group.label} count={group.lessons.length} />
          {renderRows(group.lessons)}
        </div>
      ))}
    </>
  );
};

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
  // `breakdown` covers every status; narrow it to the active chips so the header
  // reports what the filter actually matches, not just the rows that fit the cap.
  const matchingCount =
    activeStatuses.length > 0
      ? activeStatuses.reduce((sum, s) => sum + (breakdown.byStatus[s] ?? 0), 0)
      : breakdown.total;
  const selectedLesson = selected ? (lessons.find((l) => l.id === selected) ?? null) : null;

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
  );
};
