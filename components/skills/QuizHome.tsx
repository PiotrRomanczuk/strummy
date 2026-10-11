import Link from 'next/link';
import { Eye, Target, Timer, TrendingUp, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ChordDiagram } from '@/components/skills/chord-quiz/ChordDiagram';
import { CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';
import type { ChordQuizStats } from '@/lib/services/chord-quiz-stats-queries';
import { DAILY_XP_GOAL, levelFor } from '@/lib/services/chord-quiz-progress.helpers';

import {
  quizCard,
  quizEyebrow,
  QuizModeCard,
  QuizStatTile,
  QuizStreakBadge,
} from './QuizHome.Parts';

type Props = { greeting: string; name: string; stats: ChordQuizStats; dueCount: number };

const QUIZ_HREF = '/dashboard/skills/chord-quiz';

/** Claude Design quiz home: greeting, stat tiles, daily round, modes, weakest chords. */
export async function QuizHome({ greeting, name, stats, dueCount }: Props) {
  const t = await getTranslations('Skills');
  const goalShare = Math.min(1, stats.xpToday / DAILY_XP_GOAL);
  const xpLeft = Math.max(0, DAILY_XP_GOAL - stats.xpToday);
  const { level, toNext } = levelFor(stats.totalXp);
  const weakest = stats.weakest
    .map((w) => ({ ...w, voicing: CHORD_VOICINGS.find((v) => v.id === w.chordId) }))
    .filter((w) => w.voicing);

  return (
    <div className="ui-quiz-home">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ ...quizEyebrow, margin: 0 }}>{t('homeEyebrow')}</p>
          <h1
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--serif)',
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: '-0.02em',
            }}
          >
            {t('homeGreeting', { greeting, name })}
          </h1>
        </div>
        <QuizStreakBadge streak={stats.streak} label={t('streakLabel', { count: stats.streak })} />
      </header>

      <div className="ui-quiz-stats">
        <QuizStatTile
          isAccent
          icon={<Zap size={14} />}
          label={t('statXp')}
          value={stats.totalXp.toLocaleString('en-US')}
          sub={t('statXpSub', { count: toNext, level: level + 1 })}
        />
        <QuizStatTile
          icon={<Target size={14} />}
          label={t('statToday')}
          value={`${stats.xpToday}/${DAILY_XP_GOAL}`}
          sub={t('statTodaySub')}
          progress={goalShare}
        />
        <QuizStatTile
          icon={<TrendingUp size={14} />}
          label={t('statAccuracy')}
          value={stats.accuracy7d == null ? '—' : `${stats.accuracy7d}%`}
          sub={t('statAccuracySub')}
        />
        <QuizStatTile
          className="ui-quiz-stat-extra"
          icon={<Timer size={14} />}
          label={t('statAvg')}
          value={stats.avgResponseMs == null ? '—' : `${(stats.avgResponseMs / 1000).toFixed(1)}s`}
          sub={t('statAvgSub')}
        />
      </div>

      <section style={{ ...quizCard, padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <p style={{ ...quizEyebrow, margin: 0 }}>{t('goalEyebrow')}</p>
            <p
              style={{
                margin: '2px 0 0',
                fontFamily: 'var(--serif)',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {xpLeft > 0 ? t('goalLeft', { count: xpLeft }) : t('goalDone')}
            </p>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
            {Math.round(goalShare * 100)}%
          </span>
        </div>
        <div
          style={{ height: 10, borderRadius: 999, background: 'var(--rule-2)', overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${goalShare * 100}%`,
              height: '100%',
              background: 'var(--gold)',
              borderRadius: 999,
            }}
          />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-4)' }}>
          {t('goalFoot', { count: stats.sessionsToday })}
        </p>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="ui-quiz-h2">{t('pickMode')}</h2>
          <Link
            href="/dashboard/skills/history"
            style={{ fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}
          >
            {t('historyLink')}
          </Link>
        </div>
        <div className="ui-quiz-modes">
          <QuizModeCard
            isPrimary
            href={QUIZ_HREF}
            icon={<Eye size={20} />}
            title={t('modeNameTitle')}
            desc={t('modeNameDesc')}
            time={t('modeTime', { minutes: 5 })}
            start={t('modeStart')}
          />
          {dueCount > 0 && (
            <QuizModeCard
              href={QUIZ_HREF}
              icon={<Zap size={20} />}
              title={t('modeReviewTitle')}
              desc={t('modeReviewDesc')}
              time={t('hubDueCount', { count: dueCount })}
              start={t('modeStart')}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="ui-quiz-h2">{t('workingOn')}</h2>
        {weakest.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
            }}
          >
            {t('workingOnEmpty')}
          </p>
        ) : (
          <div className="ui-quiz-chords">
            {weakest.map((w) => (
              <div key={w.chordId} style={{ ...quizCard, padding: 12 }}>
                <div style={{ display: 'grid', placeItems: 'center', marginBottom: 8 }}>
                  {w.voicing && <ChordDiagram voicing={w.voicing} size="sm" hideName />}
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600 }}>
                    {w.voicing?.name}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                    {w.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
