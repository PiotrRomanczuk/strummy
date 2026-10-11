import Link from 'next/link';
import { Copy, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { LessonsBreakdown } from '@/lib/services/lessons-queries';

import { eyebrowStyle, LessonsFilterBar } from './LessonsList.Filters';
import type { LessonsListFilters } from './lessons-list.helpers';

type Props = {
  /** Every lesson matching the active filters — not just the rows on screen. */
  count: number;
  canCreate: boolean;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  breakdown: LessonsBreakdown;
  filters: LessonsListFilters;
  years: number[];
};

const buttonBase = {
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  textDecoration: 'none',
  fontFamily: 'var(--sans)',
} as const;
const primaryButton = {
  ...buttonBase,
  padding: '8px 14px',
  background: 'var(--ink)',
  color: 'var(--paper)',
  fontSize: 13,
  fontWeight: 500,
} as const;
const ghostButton = {
  ...buttonBase,
  padding: '8px 12px',
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  color: 'var(--ink-2)',
  fontSize: 12,
} as const;

const eyebrow = (showTeacher: boolean, showStudent: boolean, t: (key: string) => string): string =>
  showTeacher && showStudent
    ? t('eyebrowAll')
    : showStudent
      ? t('eyebrowTeaching')
      : t('eyebrowYours');

const summaryLine = (
  count: number,
  filters: LessonsListFilters,
  t: (key: string) => string
): string => {
  const noun = count === 1 ? t('summaryLesson') : t('summaryLessons');
  const mode = filters.sort === 'oldest' ? t('sortedByOldest') : t('sortedByNewest');
  // `count` is the full filtered total, not the rows on screen. When it spans
  // more than one page the pager below reports "Page X of Y".
  return `${count} ${noun} · ${mode}`;
};

const TitleBlock = ({
  count,
  canCreate,
  showStudentColumn,
  showTeacherColumn,
  filters,
  t,
}: {
  count: number;
  canCreate: boolean;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  filters: LessonsListFilters;
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
          fontSize: 34,
          letterSpacing: '-0.02em',
        }}
      >
        {t('title')}
      </h1>
      <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>
        {summaryLine(count, filters, t)}
      </div>
    </div>
    {canCreate && (
      <div style={{ display: 'flex', gap: 8 }}>
        <Link href="/dashboard/lessons/new?repeat=weekly" style={ghostButton}>
          <Copy size={12} strokeWidth={1.6} aria-hidden="true" />
          {t('recurring')}
        </Link>
        <Link href="/dashboard/lessons/new" style={primaryButton}>
          <Plus size={12} strokeWidth={1.8} aria-hidden="true" />
          {t('newLessonShort')}
        </Link>
      </div>
    )}
  </div>
);

export const LessonsListHeader = async ({
  count,
  canCreate,
  showStudentColumn,
  showTeacherColumn,
  breakdown,
  filters,
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
        filters={filters}
        t={t}
      />
      <LessonsFilterBar breakdown={breakdown} filters={filters} years={years} />
    </div>
  );
};
