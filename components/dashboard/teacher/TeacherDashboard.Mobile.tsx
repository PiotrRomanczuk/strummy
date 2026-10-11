import Link from 'next/link';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import type { DayLesson } from '@/lib/services/teacher-dashboard-queries';

import { PulseDot, StringWaves } from '../DashboardPrimitives';
import type { AttentionFlag } from './teacher-attention.helpers';
import { card, eyebrow } from './teacher-dashboard.styles';
import { formatClock, totalMinutesLabel } from './teacher-format.helpers';

const DEFAULT_MINUTES = 45;
const mins = (l: DayLesson) => l.durationMinutes ?? DEFAULT_MINUTES;

const untilLabel = (iso: string, now: Date): string => {
  const m = Math.max(0, Math.round((Date.parse(iso) - now.getTime()) / 60_000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

const HealthDot = ({ isAtRisk }: { isAtRisk?: boolean }) => (
  <span
    style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: isAtRisk ? 'var(--danger)' : 'var(--success)',
    }}
  />
);

const NextLessonHero = ({ lesson, now }: { lesson: DayLesson; now: Date }) => {
  const end = new Date(Date.parse(lesson.scheduledAt) + mins(lesson) * 60_000).toISOString();
  return (
    <div
      style={{
        ...card,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid var(--gold-dim)',
        padding: '16px 18px 18px',
        boxShadow: '0 8px 24px -12px rgba(200,149,35,.35)',
      }}
    >
      <StringWaves />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PulseDot size={6} />
          <span style={{ ...eyebrow, color: 'var(--gold-2)' }}>
            Next · in {untilLabel(lesson.scheduledAt, now)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <StudentInitials
            name={lesson.studentName}
            email={lesson.studentEmail}
            color={lesson.studentColor}
            size={42}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 22,
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {lesson.studentName ?? lesson.studentEmail}
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                textTransform: 'capitalize',
              }}
            >
              {formatClock(lesson.scheduledAt).replace(/[ap]$/, '')}–{formatClock(end)}
              {lesson.studentLevel ? ` · ${lesson.studentLevel}` : ''}
            </div>
          </div>
        </div>
        {lesson.songs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {lesson.songs.map((sg) => (
              <span
                key={sg.songId}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,.04)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--serif)',
                }}
              >
                {sg.songKey && (
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontStyle: 'normal',
                      color: 'var(--gold-2)',
                      marginRight: 4,
                    }}
                  >
                    {sg.songKey}
                  </span>
                )}
                {sg.title}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/dashboard/lessons/${lesson.id}`}
          style={{
            width: '100%',
            marginTop: 14,
            padding: 12,
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          Open lesson prep →
        </Link>
      </div>
    </div>
  );
};

/**
 * Phone composition of the teacher dashboard (mobile mockup): the next lesson
 * as a hero, today as a compact timeline, then the attention list. Week,
 * studio and library cards follow underneath, shared with desktop.
 */
export const TeacherMobileTop = ({
  lessons,
  flags,
  now,
}: {
  lessons: DayLesson[];
  flags: AttentionFlag[];
  now: Date;
}) => {
  const next = lessons.find((l) => Date.parse(l.scheduledAt) + mins(l) * 60_000 > now.getTime());
  const total = lessons.reduce((s, l) => s + mins(l), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
      {next && <NextLessonHero lesson={next} now={now} />}

      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ ...eyebrow, marginBottom: 10 }}>
          Today · {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          {lessons.length > 0 ? ` · ${totalMinutesLabel(total)}` : ''}
        </div>
        {lessons.length === 0 ? (
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-4)' }}>
            No lessons today.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 50 }}>
            <span
              style={{
                position: 'absolute',
                left: 46,
                top: 0,
                bottom: 0,
                width: 1,
                background: 'var(--rule)',
              }}
            />
            {lessons.map((l) => {
              const isNext = l.id === next?.id;
              return (
                <Link
                  key={l.id}
                  href={`/dashboard/lessons/${l.id}`}
                  style={{
                    position: 'relative',
                    display: 'block',
                    marginBottom: 10,
                    padding: '10px 12px',
                    border: '1px solid var(--rule)',
                    borderRadius: 10,
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -50,
                      top: 8,
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      width: 36,
                      textAlign: 'right',
                    }}
                  >
                    {formatClock(l.scheduledAt)}
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      left: -9,
                      top: 14,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isNext ? 'var(--gold-2)' : 'var(--card)',
                      border: `1.5px solid ${isNext ? 'var(--gold-2)' : 'var(--ink-5)'}`,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <StudentInitials
                      name={l.studentName}
                      email={l.studentEmail}
                      color={l.studentColor}
                      size={22}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.studentName ?? l.studentEmail}
                    </span>
                    <HealthDot isAtRisk={l.isAtRisk} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--ink-4)',
                      marginTop: 4,
                    }}
                  >
                    {mins(l)}m · {l.songs.length} {l.songs.length === 1 ? 'piece' : 'pieces'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {flags.length > 0 && (
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ ...eyebrow, color: 'var(--danger)', marginBottom: 8 }}>
            Needs attention · {flags.length}
          </div>
          {flags.map((f, i) => (
            <div
              key={f.key}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0,1fr)',
                gap: 10,
                alignItems: 'center',
                padding: '8px 0',
                borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <StudentInitials name={f.name} email={f.email} size={22} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.name ?? f.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{f.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          marginTop: 6,
          letterSpacing: '.1em',
        }}
      >
        WEEK · STUDIO · LIBRARY
      </div>
    </div>
  );
};
