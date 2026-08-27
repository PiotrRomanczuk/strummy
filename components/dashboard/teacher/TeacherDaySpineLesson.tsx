import Link from 'next/link';

import type { DayLesson } from '@/lib/services/teacher-dashboard-queries';

import { formatClock } from './teacher-format.helpers';
import { TeacherDaySpineLessonSongs } from './TeacherDaySpineLesson.Songs';
import { StudentInitials } from '../DashboardPrimitives';

type Props = {
  lesson: DayLesson;
  top: number;
  durationMinutes: number;
  hourPx: number;
  isNext: boolean;
};

const endTimeIso = (startIso: string, durationMinutes: number): string => {
  const end = new Date(startIso);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return end.toISOString();
};

/** The block's box. `left` clears the 24px gutter plus the 52px hour-label
 *  column and its 14px gap, so the block starts where the timeline rules do.
 *  `height` is the lesson's duration in pixels — it is the block's meaning, not
 *  decoration, which is why content that does not fit gets clipped (see the
 *  `.ui-dayspine-*` rules) rather than stretching the card. */
const blockStyle = (top: number, height: number, isNext: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: 24 + 52 + 14,
  right: 24,
  top,
  height,
  border: `1px solid ${isNext ? 'var(--gold-dim)' : 'var(--rule)'}`,
  background: isNext ? 'linear-gradient(135deg, var(--gold-tint), var(--card))' : 'var(--card)',
  borderRadius: 12,
  padding: '12px 16px',
  boxShadow: isNext ? '0 8px 24px -12px rgba(200,149,35,.35)' : '0 1px 2px rgba(26,22,19,.04)',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  gap: 14,
  alignItems: 'flex-start',
  zIndex: 2,
  textDecoration: 'none',
  color: 'inherit',
});

export const TeacherDaySpineLesson = ({ lesson, top, durationMinutes, hourPx, isNext }: Props) => {
  const blockHeight = Math.max(72, (durationMinutes / 60) * hourPx - 6);
  const studentDisplay = lesson.studentName ?? lesson.studentEmail ?? 'Student';
  const endIso = endTimeIso(lesson.scheduledAt, durationMinutes);

  return (
    <Link
      href={`/dashboard/lessons/${lesson.id}`}
      className="ui-dayspine-lesson"
      style={blockStyle(top, blockHeight, isNext)}
    >
      <StudentInitials name={lesson.studentName} email={lesson.studentEmail} size={36} />
      <div style={{ minWidth: 0 }}>
        {/* No flex wrapper: the name is this line's only child, and a block
            element is what makes the ellipsis work at all. */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {studentDisplay}
        </div>
        <div
          className="ui-dayspine-time"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            marginTop: 3,
          }}
        >
          {formatClock(lesson.scheduledAt)}
          <span className="ui-dayspine-narrow-hide">
            –{formatClock(endIso)} · {durationMinutes}m
          </span>
        </div>
        <TeacherDaySpineLessonSongs songs={lesson.songs} />
      </div>
      <span
        className="ui-dayspine-narrow-hide"
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: isNext ? 'var(--ink)' : 'transparent',
          color: isNext ? 'var(--paper)' : 'var(--ink-2)',
          border: isNext ? 'none' : '1px solid var(--rule)',
          fontSize: 11,
          fontWeight: 500,
          fontFamily: 'var(--sans)',
          alignSelf: 'flex-start',
        }}
      >
        {isNext ? 'Prep →' : 'Open'}
      </span>
    </Link>
  );
};
