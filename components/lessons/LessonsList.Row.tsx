import { getTranslations } from 'next-intl/server';

import { DataListCell, DataListRow } from '@/components/shared/DataList';
import type { LessonRow } from '@/lib/services/lessons-queries';
import {
  lessonStatusColour,
  lessonStatusLabel,
  songStatusColour,
} from '@/lib/services/lessons-queries';

import {
  formatLessonClock,
  formatLessonDate,
  formatLessonDuration,
  formatLessonWeekday,
} from './lesson-format.helpers';
import { LessonStatusPill, StudentInitials } from './LessonPrimitives';
import { buildHref, type LessonsListFilters } from './lessons-list.helpers';

type Props = {
  lesson: LessonRow;
  showStudentColumn: boolean;
  showTeacherColumn: boolean;
  template: string;
  filters: LessonsListFilters;
};

const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const SongsCell = ({
  count,
  statuses,
  t,
}: {
  count: number;
  statuses: string[];
  t: (key: string) => string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{count}</span>
    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
      {count === 1 ? t('song') : t('songs')}
    </span>
    {count > 0 && (
      <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }} aria-hidden="true">
        {statuses.slice(0, 4).map((status, i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: songStatusColour(status),
            }}
          />
        ))}
      </span>
    )}
  </div>
);

const NumberBadge = ({ value }: { value: number }) => (
  <span
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 10,
      color: 'var(--ink-4)',
      padding: '2px 6px',
      background: 'var(--rule-2)',
      borderRadius: 4,
      flexShrink: 0,
    }}
  >
    #{value}
  </span>
);

/**
 * Phone-only trailing block: the time and the status — what a teacher scans a
 * day's lessons for. Rendered for every role, since neither field is scoped.
 */
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

export const LessonRowItem = async ({
  lesson: l,
  showStudentColumn,
  showTeacherColumn,
  template,
  filters,
}: Props) => {
  const t = await getTranslations('Lessons');
  const studentDisplay = l.studentName ?? l.studentEmail ?? t('studentFallback');
  const title = l.title ?? t('untitledLesson');
  const isSelected = filters.selected === l.id;

  // The row link's accessible name has to identify the lesson on its own: the
  // list can hold several lessons with the same title, so the number and date
  // are what make it unambiguous to a screen reader and to a test.
  const rowLabel = `#${l.lessonNumber} ${title} — ${formatLessonDate(l.scheduledAt)}`;

  const mobileMeta = [formatLessonDate(l.scheduledAt), showStudentColumn ? studentDisplay : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <DataListRow
      template={template}
      href={buildHref({ selected: isSelected ? undefined : l.id }, filters)}
      label={rowLabel}
      selected={isSelected}
      mobileMeta={mobileMeta || undefined}
      mobileSplit
      mobileTrail={<MobileTrail lesson={l} t={t} />}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--gold-2)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            fontWeight: 500,
          }}
        >
          {formatLessonWeekday(l.scheduledAt)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
          {formatLessonDate(l.scheduledAt)}
        </div>
      </div>

      {showStudentColumn && (
        <DataListCell>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <StudentInitials name={l.studentName} email={l.studentEmail} size={28} />
            <span style={{ fontSize: 13, fontWeight: 500, ...ellipsis }}>{studentDisplay}</span>
          </span>
        </DataListCell>
      )}

      {showTeacherColumn && (
        <DataListCell>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <StudentInitials name={l.teacherName} email={l.teacherEmail} size={28} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)', ...ellipsis }}>
              {l.teacherName ?? l.teacherEmail ?? t('teacherFallback')}
            </span>
          </span>
        </DataListCell>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <NumberBadge value={l.lessonNumber} />
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink-2)',
            ...ellipsis,
          }}
        >
          {title}
        </span>
      </div>

      <DataListCell>
        <SongsCell count={l.songCount} statuses={l.songStatuses} t={t} />
      </DataListCell>

      <DataListCell mono>
        {formatLessonClock(l.scheduledAt)}
        {formatLessonDuration(l.durationMinutes) ? (
          <span style={{ color: 'var(--ink-4)' }}>
            {' '}
            · {formatLessonDuration(l.durationMinutes)}
          </span>
        ) : null}
      </DataListCell>

      <DataListCell align="right">
        <LessonStatusPill
          label={lessonStatusLabel(l.status, t, l.scheduledAt)}
          colour={lessonStatusColour(l.status, l.scheduledAt)}
        />
      </DataListCell>
    </DataListRow>
  );
};
