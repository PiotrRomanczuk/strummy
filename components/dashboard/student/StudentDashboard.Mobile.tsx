import Link from 'next/link';
import { Check, Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatLessonClockShort } from '@/components/lessons/lesson-format.helpers';

import type { StudentHomeData } from './student-home.data';
import { countdownLabel } from './student-home.helpers';
import { PulseDot, StringWaves } from '../DashboardPrimitives';
import { eyebrow, HomeCard } from './StudentHomePrimitives';

const RECAP_CHARS = 140;
const mobileCard = { padding: '16px 18px', borderRadius: 14 } as const;

/**
 * Phone composition from the mobile mockup: a compact countdown, today's set
 * with a progress bar, a three-figure stat strip and a short recap. The full
 * cards (repertoire, activity, achievements) follow underneath.
 */
export async function StudentMobileTop({ home, now }: { home: StudentHomeData; now: Date }) {
  const t = await getTranslations('StudentHome');
  const { nextLesson: lesson, practiceSet, minutesToday, lastLesson } = home;
  const goal = practiceSet.reduce((sum, i) => sum + i.minutes, 0);
  const mastered = home.repertoire.filter((s) => s.status === 'mastered').length;
  const recap = lastLesson?.notes?.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
      <HomeCard
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          padding: '18px 18px 20px',
        }}
      >
        <StringWaves />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PulseDot size={6} />
            <span style={{ ...eyebrow, color: 'var(--gold-2)' }}>
              {lesson
                ? t('lessonWith', { name: lesson.teacher.name ?? t('teacherFallback') })
                : t('nextLesson')}
            </span>
          </div>
          <div
            className="ui-student-countdown"
            style={{ fontSize: lesson ? 52 : 34, marginTop: 8 }}
          >
            {lesson ? (
              <>
                {t('countdownIn')}{' '}
                <em style={{ color: 'var(--gold-2)' }}>
                  {countdownLabel(lesson.scheduledAt, now)}
                </em>
              </>
            ) : (
              <em style={{ color: 'var(--ink-3)' }}>{t('noLessonTitle')}</em>
            )}
          </div>
          {lesson && (
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                marginTop: 8,
              }}
            >
              {[
                formatLessonClockShort(lesson.scheduledAt),
                lesson.durationMinutes ? `${lesson.durationMinutes}m` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          <Link
            href="/dashboard/practice"
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
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <Play size={11} fill="currentColor" strokeWidth={0} /> {t('startPractice')}
          </Link>
        </div>
      </HomeCard>

      <HomeCard style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <span style={eyebrow}>{t('todaysPractice')}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            {t('todayProgress', { done: minutesToday, goal })}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 10 }}>
          {t('setSummary', { minutes: goal, count: practiceSet.length })}
        </div>
        <div
          style={{ height: 4, background: 'var(--rule-2)', borderRadius: 4, overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${goal ? Math.min(100, (minutesToday / goal) * 100) : 0}%`,
              height: '100%',
              background: 'var(--gold-2)',
            }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {practiceSet.map((p, i) => (
            <Link
              key={p.assignmentId}
              href={`/dashboard/assignments/${p.assignmentId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px minmax(0,1fr) auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                borderBottom: '1px solid var(--rule)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: `1.5px solid ${p.isDoneToday ? 'var(--gold-2)' : 'var(--ink-5)'}`,
                  background: p.isDoneToday ? 'var(--gold-2)' : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {p.isDoneToday && <Check size={9} color="#fff" strokeWidth={3} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 14,
                    fontStyle: p.isSong ? 'italic' : 'normal',
                    fontWeight: 500,
                  }}
                >
                  {p.title}
                </div>
                {p.sub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{p.sub}</div>}
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                {p.minutes}m
              </span>
            </Link>
          ))}
        </div>
      </HomeCard>

      <HomeCard
        style={{ ...mobileCard, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}
      >
        {[
          { label: t('statStreak'), value: `${home.streak}d`, accent: 'var(--gold-2)' },
          { label: t('statSongs'), value: home.repertoire.length, accent: 'var(--ink)' },
          { label: t('statMastered'), value: mastered, accent: 'var(--success)' },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{ textAlign: 'center', borderLeft: i === 0 ? 'none' : '1px solid var(--rule)' }}
          >
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                letterSpacing: '-0.02em',
                color: m.accent,
                fontWeight: 500,
              }}
            >
              {m.value}
            </div>
            <div style={{ ...eyebrow, marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </HomeCard>

      {recap && lastLesson && (
        <Link
          href={`/dashboard/lessons/${lastLesson.id}`}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <HomeCard style={mobileCard}>
            <span style={eyebrow}>{t('lastLesson')}</span>
            <div
              style={{
                marginTop: 8,
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 1.5,
                paddingLeft: 12,
                borderLeft: '2px solid var(--gold-dim)',
                color: 'var(--ink-2)',
              }}
            >
              &ldquo;{recap.length > RECAP_CHARS ? `${recap.slice(0, RECAP_CHARS)}…` : recap}&rdquo;
            </div>
          </HomeCard>
        </Link>
      )}

      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          marginTop: 6,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}
      >
        {t('keepScrolling')}
      </div>
    </div>
  );
}
