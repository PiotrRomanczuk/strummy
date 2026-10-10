import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { DataListCell, DataListRow } from '@/components/shared/DataList';
import type { LessonRow } from '@/lib/services/lessons-queries';
import { lessonStatusColour, lessonStatusLabel } from '@/lib/services/lessons-queries';

import {
  formatLessonClock,
  formatLessonClockShort,
  formatLessonDate,
  formatLessonDateParts,
} from './lesson-format.helpers';
import { LessonStatusPill, StudentInitials } from './LessonPrimitives';
import { LessonRowSongs, LessonRowTitle, PersonCell } from './LessonsList.RowCells';
import { buildHref, type LessonsListFilters } from './lessons-list.helpers';

type Props = {
  lesson: LessonRow;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  template: string;
  filters: LessonsListFilters;
};

const mono = { fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase' } as const;

/** Phone-only trailing block: time and status — what a teacher scans a day for. */
const MobileTrail = ({ lesson: l, t }: { lesson: LessonRow; t: (key: string) => string }) => (
  <>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
      {formatLessonClock(l.scheduledAt)}
    </span>
    <LessonStatusPill
      label={lessonStatusLabel(l.status, t, l.scheduledAt)}
      colour={lessonStatusColour(l.status, l.scheduledAt)}
    />
  </>
);

/** One row of the Claude Design lesson table. The row opens the detail panel. */
export const LessonRowItem = async ({
  lesson: l,
  showStudentColumn,
  showTeacherColumn,
  template,
  filters,
}: Props) => {
  const t = await getTranslations('Lessons');
  const title = l.title ?? t('untitledLesson');
  const isSelected = filters.selected === l.id;
  const { monthDay, weekdayYear } = formatLessonDateParts(l.scheduledAt);
  // The row link's accessible name has to identify the lesson on its own: the
  // list can hold several lessons with the same title, so the number and date
  // are what make it unambiguous to a screen reader and to a test.
  const rowLabel = `#${l.lessonNumber} ${title} — ${formatLessonDate(l.scheduledAt)}`;
  const studentDisplay = l.studentName ?? l.studentEmail ?? t('studentFallback');
  const mobileMeta = [formatLessonDate(l.scheduledAt), showStudentColumn ? studentDisplay : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <DataListRow
      template={template}
      href={buildHref({ selected: isSelected ? undefined : l.id }, filters)}
      selected={isSelected}
      label={rowLabel}
      mobileMeta={mobileMeta || undefined}
      mobileSplit
      mobileTrail={<MobileTrail lesson={l} t={t} />}
    >
      <div className="ui-datalist-desktop">
        <div style={{ ...mono, color: 'var(--gold-2)', letterSpacing: '.12em', fontWeight: 500 }}>
          {monthDay}
        </div>
        <div style={{ ...mono, color: 'var(--ink-4)', letterSpacing: '.1em', marginTop: 2 }}>
          {weekdayYear}
        </div>
      </div>

      <LessonRowTitle number={l.lessonNumber} title={l.title} notes={l.notes} t={t} />

      {showStudentColumn && (
        <PersonCell
          avatar={
            <StudentInitials
              name={l.studentName}
              email={l.studentEmail}
              color={l.studentColor}
              size={24}
            />
          }
          name={studentDisplay}
          sub={l.studentLevel}
        />
      )}

      {showTeacherColumn && (
        <PersonCell
          avatar={
            <StudentInitials
              name={l.teacherName}
              email={l.teacherEmail}
              color={l.teacherColor}
              size={24}
            />
          }
          name={l.teacherName ?? l.teacherEmail ?? t('teacherFallback')}
        />
      )}

      <DataListCell>
        <LessonRowSongs count={l.songCount} statuses={l.songStatuses} t={t} />
      </DataListCell>

      <DataListCell mono>
        <span style={{ color: 'var(--ink-2)' }}>{formatLessonClockShort(l.scheduledAt)}</span>
        {l.durationMinutes != null && (
          <span style={{ color: 'var(--ink-4)' }}> · {l.durationMinutes}m</span>
        )}
      </DataListCell>

      <DataListCell>
        <LessonStatusPill
          label={lessonStatusLabel(l.status, t, l.scheduledAt)}
          colour={lessonStatusColour(l.status, l.scheduledAt)}
        />
      </DataListCell>

      <div className="ui-datalist-desktop" style={{ textAlign: 'right', color: 'var(--ink-4)' }}>
        <ChevronRight size={14} strokeWidth={1.6} style={{ display: 'inline-block' }} />
      </div>
    </DataListRow>
  );
};
