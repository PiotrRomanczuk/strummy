import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonRow, LessonsBreakdown } from '@/lib/services/lessons-queries';

import { Card } from './LessonPrimitives';
import { groupLessonsByTime } from './lesson-grouping.helpers';
import { LessonsListHeader } from './LessonsList.Header';
import { LessonRowItem } from './LessonsList.Row';
import { pageHref, type LessonsListState, type LessonsSort } from './lessons-list.helpers';

const pagerLink: React.CSSProperties = {
  color: 'var(--gold-2)',
  textDecoration: 'none',
};

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
};

const emptyMessage = (
  showTeacher: boolean,
  showStudent: boolean,
  t: (key: string) => string
): string =>
  showTeacher ? t('emptyAllTeachers') : showStudent ? t('emptyTeacher') : t('emptyStudent');

const columnTemplate = (showStudent: boolean, showTeacher: boolean): string => {
  // Date · [Student] · [Teacher] · Title · Songs · Time · Status
  if (showStudent && showTeacher) {
    return 'grid grid-cols-1 md:grid-cols-[130px_140px_130px_1fr_136px_84px_110px]';
  }
  if (showStudent) {
    return 'grid grid-cols-1 md:grid-cols-[140px_150px_1fr_136px_84px_110px]';
  }
  return 'grid grid-cols-1 md:grid-cols-[150px_1fr_136px_84px_110px]';
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

const ColumnLabels = ({
  showStudentColumn,
  showTeacherColumn,
  tableColClass,
  t,
}: {
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  tableColClass: string;
  t: (key: string) => string;
}) => (
  <div
    className={`hidden md:grid ${tableColClass}`}
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
    <span>{t('colDate')}</span>
    {showStudentColumn && <span>{t('colStudent')}</span>}
    {showTeacherColumn && <span>{t('colTeacher')}</span>}
    <span>{t('colTitle')}</span>
    <span>{t('colSongs')}</span>
    <span>{t('colTime')}</span>
    <span style={{ textAlign: 'right' }}>{t('colStatus')}</span>
  </div>
);

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
  tableColClass,
  flat,
  t,
}: {
  lessons: LessonRow[];
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  tableColClass: string;
  flat: boolean;
  t: (key: string) => string;
}) => {
  const renderRows = (items: LessonRow[]) =>
    items.map((l) => (
      <LessonRowItem
        key={l.id}
        lesson={l}
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        tableColClass={tableColClass}
      />
    ));

  return (
    <div>
      <ColumnLabels
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        tableColClass={tableColClass}
        t={t}
      />
      {flat
        ? renderRows(lessons)
        : groupLessonsByTime(lessons, new Date()).map((group) => (
            <div key={group.key}>
              <SectionHeader label={group.label} count={group.lessons.length} />
              {renderRows(group.lessons)}
            </div>
          ))}
    </div>
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
}: Props) => {
  const t = await getTranslations('Lessons');
  const tableColClass = columnTemplate(showStudentColumn, showTeacherColumn);
  const state: LessonsListState = {
    statuses: activeStatuses,
    sort: activeSort,
    year: activeYear,
    flat,
  };
  // `breakdown` covers every status; narrow it to the active chips so the header
  // reports what the filter actually matches, not just the rows that fit the cap.
  const matchingCount =
    activeStatuses.length > 0
      ? activeStatuses.reduce((sum, s) => sum + (breakdown.byStatus[s] ?? 0), 0)
      : breakdown.total;

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
        state={state}
        years={years}
      />
      <Card>
        {lessons.length === 0 ? (
          <EmptyState message={emptyMessage(showTeacherColumn, showStudentColumn, t)} />
        ) : (
          <ListBody
            lessons={lessons}
            showStudentColumn={showStudentColumn}
            showTeacherColumn={showTeacherColumn}
            tableColClass={tableColClass}
            flat={flat}
            t={t}
          />
        )}
      </Card>
      {pageCount > 1 && (
        <nav
          aria-label={t('pagesAriaLabel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 16,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
          }}
        >
          {activePage > 1 ? (
            <Link href={pageHref(state, activePage - 1)} style={pagerLink}>
              {t('newer')}
            </Link>
          ) : (
            <span style={{ ...pagerLink, opacity: 0.35 }}>{t('newer')}</span>
          )}
          <span style={{ color: 'var(--ink-3)' }}>
            {t('pageOf', { page: activePage, count: pageCount })}
          </span>
          {activePage < pageCount ? (
            <Link href={pageHref(state, activePage + 1)} style={pagerLink}>
              {t('older')}
            </Link>
          ) : (
            <span style={{ ...pagerLink, opacity: 0.35 }}>{t('older')}</span>
          )}
        </nav>
      )}
    </div>
  );
};
