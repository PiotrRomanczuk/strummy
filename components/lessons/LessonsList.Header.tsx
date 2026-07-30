import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonsBreakdown } from '@/lib/services/lessons-queries';

import { eyebrowStyle, FilterRow } from './LessonsList.Filters';
import type { LessonsListState } from './LessonsList.helpers';

type Props = {
  /** Every lesson matching the active filters — not just the rows on screen. */
  count: number;
  canCreate: boolean;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  breakdown: LessonsBreakdown;
  state: LessonsListState;
  years: number[];
};

const eyebrow = (showTeacher: boolean, showStudent: boolean, t: (key: string) => string): string =>
  showTeacher ? t('eyebrowAll') : showStudent ? t('eyebrowTeaching') : t('eyebrowYours');

const summaryLine = (
  count: number,
  state: LessonsListState,
  t: (key: string) => string
): string => {
  const noun = count === 1 ? t('summaryLesson') : t('summaryLessons');
  const mode = state.flat
    ? state.sort === 'newest'
      ? t('sortedByNewest')
      : t('sortedByOldest')
    : t('groupedByDate');
  // `count` is the full filtered total, not the rows on screen. When it spans
  // more than one page the pager below reports "Page X of Y".
  return `${count} ${noun} · ${mode}`;
};

const TitleBlock = ({
  count,
  canCreate,
  showStudentColumn,
  showTeacherColumn,
  state,
  t,
}: {
  count: number;
  canCreate: boolean;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  state: LessonsListState;
  t: (key: string) => string;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 18,
    }}
  >
    <div>
      <div style={eyebrowStyle}>{eyebrow(showTeacherColumn, showStudentColumn, t)}</div>
      <h1
        style={{
          margin: '4px 0 0',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 40,
          letterSpacing: '-0.02em',
          fontStyle: 'italic',
        }}
      >
        {t('title')}
      </h1>
      <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
        {summaryLine(count, state, t)}
      </div>
    </div>
    {canCreate && (
      <Link
        href="/dashboard/lessons/new"
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--paper)',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          fontFamily: 'var(--sans)',
        }}
      >
        {t('newLesson')}
      </Link>
    )}
  </div>
);

export const LessonsListHeader = async ({
  count,
  canCreate,
  showStudentColumn,
  showTeacherColumn,
  breakdown,
  state,
  years,
}: Props) => {
  const t = await getTranslations('Lessons');
  return (
    <div style={{ padding: '0 0 18px' }}>
      <TitleBlock
        count={count}
        canCreate={canCreate}
        showStudentColumn={showStudentColumn}
        showTeacherColumn={showTeacherColumn}
        state={state}
        t={t}
      />
      <FilterRow breakdown={breakdown} state={state} years={years} />
    </div>
  );
};
