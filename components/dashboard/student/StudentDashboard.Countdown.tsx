import Link from 'next/link';
import { Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import {
  formatLessonClockShort,
  formatLessonFormat,
} from '@/components/lessons/lesson-format.helpers';
import type { StudentHomeLesson } from '@/lib/services/student-home-queries';

import { countdownLabel, relativeDay, type WeekStripDay } from './student-home.helpers';
import { PulseDot } from '../DashboardPrimitives';
import { eyebrow } from './StudentHomePrimitives';
import { StudentWeekStrip } from './StudentDashboard.WeekStrip';

type Props = { lesson: StudentHomeLesson | null; week: WeekStripDay[]; now: Date };

const ghostButton = {
  padding: '12px 16px',
  border: '1px solid var(--rule)',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink-2)',
  textDecoration: 'none',
} as const;

/** Hero, left half: countdown to the next lesson, this week's practice bars, CTAs. */
export async function StudentCountdown({ lesson, week, now }: Props) {
  const t = await getTranslations('StudentHome');
  const day = lesson ? relativeDay(lesson.scheduledAt, now) : null;
  const when = lesson
    ? day
      ? t(day)
      : new Date(lesson.scheduledAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
    : null;
  const teacherName = lesson?.teacher.name ?? lesson?.teacher.email ?? t('teacherFallback');
  const meta = lesson
    ? [
        lesson.durationMinutes ? `${lesson.durationMinutes}m` : null,
        formatLessonFormat(lesson.format),
      ].filter(Boolean)
    : [];
  const mailto =
    lesson?.teacher.email &&
    `mailto:${lesson.teacher.email}?subject=${encodeURIComponent(t('rescheduleSubject', { date: `${when} ${formatLessonClockShort(lesson.scheduledAt)}` }))}`;

  return (
    <div className="ui-student-hero-left">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PulseDot />
        <span style={{ ...eyebrow, color: 'var(--gold-2)' }}>{t('nextLesson')}</span>
      </div>

      {lesson ? (
        <div>
          <div className="ui-student-countdown">
            {t('countdownIn')}{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>
              {countdownLabel(lesson.scheduledAt, now)}
            </em>
          </div>
          <div
            style={{
              marginTop: 12,
              color: 'var(--ink-3)',
              fontSize: 15,
              lineHeight: 1.45,
              maxWidth: 480,
            }}
          >
            {t('with')}{' '}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                verticalAlign: 'middle',
              }}
            >
              <StudentInitials
                name={lesson.teacher.name}
                email={lesson.teacher.email}
                color={lesson.teacher.color}
                size={22}
              />
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{teacherName}</span>
            </span>
            {' · '}
            <Link
              href={`/dashboard/lessons/${lesson.id}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {when}{' '}
              <span style={{ fontFamily: 'var(--mono)' }}>
                {formatLessonClockShort(lesson.scheduledAt)}
              </span>
            </Link>
            {meta.map((m) => ` · ${m}`)}
          </div>
        </div>
      ) : (
        <div>
          <div className="ui-student-countdown" style={{ fontSize: 44 }}>
            <em style={{ color: 'var(--ink-3)' }}>{t('noLessonTitle')}</em>
          </div>
          <div style={{ marginTop: 12, color: 'var(--ink-3)', fontSize: 15 }}>
            {t('noLessonBody')}
          </div>
        </div>
      )}

      <StudentWeekStrip week={week} label={t('thisWeek')} />

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/practice"
          style={{
            padding: '12px 20px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 6px 16px -8px rgba(26,22,19,.4)',
            textDecoration: 'none',
          }}
        >
          <Play size={11} fill="currentColor" strokeWidth={0} /> {t('startPractice')}
        </Link>
        {mailto && (
          <a href={mailto} style={ghostButton}>
            {t('reschedule')}
          </a>
        )}
      </div>
    </div>
  );
}
