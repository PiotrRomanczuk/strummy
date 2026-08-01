import type { TeacherDayStats } from '@/lib/services/teacher-dashboard-queries';

import { greetingName } from '../greeting.helpers';

import { greetingFor, totalMinutesLabel } from './teacher-format.helpers';

type Props = {
  fullName: string | null;
  email: string;
  now: Date;
  stats: TeacherDayStats;
};

export const TeacherGreeting = ({ fullName, email, now, stats }: Props) => {
  const dayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = greetingFor(now);
  const first = greetingName(fullName, email);
  const minutesLabel = totalMinutesLabel(stats.totalMinutes);

  return (
    <div style={{ padding: '0 0 18px 0' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.16em',
        }}
      >
        {dayLabel}
      </div>
      <h1
        style={{
          margin: '4px 0 6px',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 40,
          letterSpacing: '-0.02em',
          fontStyle: 'italic',
          // A name with no spaces cannot be allowed to set the page width: an
          // unbroken 38-char greeting pushed the whole mobile dashboard to
          // 486px at a 390px viewport and made the page scroll sideways.
          overflowWrap: 'anywhere',
        }}
      >
        {time}, {first}.
      </h1>
      <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        {stats.count === 0 ? (
          <>No lessons on your books today. A good day to refine the library.</>
        ) : (
          <>
            <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
              {stats.count} lesson{stats.count === 1 ? '' : 's'}
            </strong>{' '}
            scheduled · {minutesLabel} of teaching.
          </>
        )}
      </div>
    </div>
  );
};
