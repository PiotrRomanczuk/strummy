import Link from 'next/link';
import type { DayLesson } from '@/lib/services/teacher-dashboard-queries';

import { formatClock, minutesIntoDay, totalMinutesLabel } from './teacher-format.helpers';
import { TeacherDaySpineLesson } from './TeacherDaySpineLesson';

// The mockup's 9a–8p window; it stretches to fit any lesson outside it.
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 20;
const HOUR_PX = 56;
const DEFAULT_LESSON_MINUTES = 45;

const formatHourLabel = (hour: number): string => {
  if (hour === 12) return '12p';
  return hour > 12 ? `${hour - 12}p` : `${hour}a`;
};

type Props = {
  lessons: DayLesson[];
  now: Date;
};

export const TeacherDaySpine = ({ lessons, now }: Props) => {
  const starts = lessons.map((l) => minutesIntoDay(l.scheduledAt));
  const ends = lessons.map((l, i) => starts[i] + (l.durationMinutes ?? DEFAULT_LESSON_MINUTES));
  const START_HOUR = Math.min(DEFAULT_START_HOUR, ...starts.map((m) => Math.floor(m / 60)));
  const END_HOUR = Math.min(24, Math.max(DEFAULT_END_HOUR, ...ends.map((m) => Math.ceil(m / 60))));
  const totalHours = END_HOUR - START_HOUR;
  const totalH = totalHours * HOUR_PX;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_PX + 12;
  const showNowMarker = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  const nextLessonIdx = lessons.findIndex(
    (l) => new Date(l.scheduledAt).getTime() >= now.getTime()
  );

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          padding: '22px 24px 14px 24px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--gold-2)',
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              fontWeight: 500,
            }}
          >
            Today’s schedule
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              marginTop: 2,
            }}
          >
            {lessons.length === 0 ? (
              <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Nothing booked</span>
            ) : (
              <>
                {lessons.length} lesson{lessons.length === 1 ? '' : 's'} ·{' '}
                <span style={{ color: 'var(--ink-4)' }}>
                  {totalMinutesLabel(
                    lessons.reduce(
                      (sum, l) => sum + (l.durationMinutes ?? DEFAULT_LESSON_MINUTES),
                      0
                    )
                  )}{' '}
                  teaching
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Today', href: '/dashboard', isActive: true },
            { label: 'Week', href: '/dashboard/calendar', isActive: false },
            { label: 'Month', href: '/dashboard/calendar', isActive: false },
          ].map((v) => (
            <Link
              key={v.label}
              href={v.href}
              aria-current={v.isActive ? 'page' : undefined}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${v.isActive ? 'var(--ink)' : 'var(--rule)'}`,
                background: v.isActive ? 'var(--ink)' : 'var(--card)',
                color: v.isActive ? 'var(--paper)' : 'var(--ink-3)',
                fontSize: 11,
                textDecoration: 'none',
              }}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', height: totalH + 56, padding: '12px 24px 12px 24px' }}>
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const hour = START_HOUR + i;
          return (
            <div
              key={hour}
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: i * HOUR_PX + 12,
                display: 'grid',
                gridTemplateColumns: '52px 1fr',
                gap: 14,
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  textAlign: 'right',
                }}
              >
                {formatHourLabel(hour)}
              </div>
              <div
                style={{
                  height: 1,
                  background: 'var(--rule)',
                  opacity: hour % 2 === 0 ? 0.9 : 0.4,
                }}
              />
            </div>
          );
        })}

        {showNowMarker && (
          <div
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: nowTop,
              display: 'grid',
              gridTemplateColumns: '52px 1fr',
              gap: 14,
              alignItems: 'center',
              zIndex: 3,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--gold-2)',
                textAlign: 'right',
                fontWeight: 600,
                background: 'var(--card)',
                justifySelf: 'end',
                padding: '1px 3px',
                borderRadius: 3,
              }}
            >
              {formatClock(now.toISOString())}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--gold-2)',
                  color: '#fff',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '.12em',
                  fontWeight: 600,
                  boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.18)',
                }}
              >
                CAPO · NOW
              </span>
              <span
                style={{
                  flex: 1,
                  height: 2,
                  background: 'linear-gradient(90deg, var(--gold-2), transparent)',
                  borderRadius: 1,
                }}
              />
            </div>
          </div>
        )}

        {lessons.map((l, idx) => {
          const top = ((minutesIntoDay(l.scheduledAt) - START_HOUR * 60) / 60) * HOUR_PX + 12;
          return (
            <TeacherDaySpineLesson
              key={l.id}
              lesson={l}
              top={top}
              durationMinutes={l.durationMinutes ?? DEFAULT_LESSON_MINUTES}
              hourPx={HOUR_PX}
              isNext={idx === nextLessonIdx}
            />
          );
        })}
      </div>
    </div>
  );
};
