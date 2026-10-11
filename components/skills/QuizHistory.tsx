import Link from 'next/link';
import { Flame, Hash, Trophy, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';
import type { ChordQuizHistory } from '@/lib/services/chord-quiz-history-queries';
import { levelFor } from '@/lib/services/chord-quiz-progress.helpers';

import { quizCard, quizEyebrow, QuizStatTile } from './QuizHome.Parts';

const HEAT = [
  'var(--rule-2)',
  'color-mix(in oklab, var(--gold) 30%, var(--rule-2))',
  'color-mix(in oklab, var(--gold) 55%, var(--rule-2))',
  'color-mix(in oklab, var(--gold) 80%, var(--rule-2))',
  'var(--gold-2)',
];
const heatLevel = (n: number) => (n === 0 ? 0 : n < 5 ? 1 : n < 10 ? 2 : n < 20 ? 3 : 4);

/** Accuracy ring: a gold arc on a rule track, chord name underneath. */
const MasteryRing = ({ name, pct }: { name: string; pct: number }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = pct >= 90 ? 'var(--success)' : pct >= 60 ? 'var(--gold-2)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" role="img" aria-label={`${name} ${pct}%`}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--rule-2)" strokeWidth={5} />
        {pct > 0 && (
          <circle
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            transform="rotate(-90 32 32)"
          />
        )}
        <text
          x={32}
          y={36}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize={12}
          fill="var(--ink)"
        >
          {pct}%
        </text>
      </svg>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600 }}>{name}</span>
    </div>
  );
};

/** Claude Design quiz history: stat tiles, 12-week heatmap, chord mastery rings. */
export async function QuizHistory({ history }: { history: ChordQuizHistory }) {
  const t = await getTranslations('Skills');
  const total = history.weeks.flat().reduce((s, n) => s + n, 0);
  const named = history.chords
    .map((c) => ({ ...c, name: CHORD_VOICINGS.find((v) => v.id === c.chordId)?.name ?? c.chordId }))
    .slice(0, 12);

  return (
    <div className="ui-quiz-home">
      <header>
        <Link href="/dashboard/skills" style={{ ...quizEyebrow, textDecoration: 'none' }}>
          {t('historyBack')}
        </Link>
        <h1
          style={{
            margin: '4px 0 0',
            fontFamily: 'var(--serif)',
            fontWeight: 600,
            fontSize: 30,
            letterSpacing: '-0.02em',
          }}
        >
          {t('historyTitle')}
        </h1>
      </header>

      <div className="ui-quiz-stats ui-quiz-stats-4">
        <QuizStatTile
          icon={<Hash size={14} />}
          label={t('historySessions')}
          value={String(history.sessions30d)}
          sub={t('historySessionsSub')}
        />
        <QuizStatTile
          icon={<Flame size={14} />}
          label={t('historyBestStreak')}
          value={String(history.bestStreak)}
          sub={t('historyBestStreakSub', { count: history.streak })}
        />
        <QuizStatTile
          isAccent
          icon={<Zap size={14} />}
          label={t('historyTotalXp')}
          value={history.totalXp.toLocaleString('en-US')}
          sub={t('historyTotalXpSub', { level: levelFor(history.totalXp).level })}
        />
        <QuizStatTile
          icon={<Trophy size={14} />}
          label={t('historyMastered')}
          value={`${history.mastered}/${history.chordsSeen}`}
          sub={t('historyMasteredSub')}
        />
      </div>

      <section style={{ ...quizCard, padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>
              {t('historyActivity')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
              {t('historyActivitySub', { count: total })}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
            }}
          >
            {t('historyLess')}
            {HEAT.map((c) => (
              <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
            ))}
            {t('historyMore')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {history.weeks.map((week, wi) => (
            <div
              key={wi}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 auto' }}
            >
              {week.map((n, di) => (
                <span
                  key={di}
                  title={`${n}`}
                  style={{ width: 14, height: 14, borderRadius: 3, background: HEAT[heatLevel(n)] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            maxWidth: 12 * 18,
          }}
        >
          <span>{t('historyWeeksAgo')}</span>
          <span>{t('historyToday')}</span>
        </div>
      </section>

      <section style={{ ...quizCard, padding: 24 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>
          {t('historyMastery')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', margin: '2px 0 16px' }}>
          {t('historyMasterySub')}
        </div>
        {named.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-4)',
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
            }}
          >
            {t('historyEmpty')}
          </p>
        ) : (
          <div className="ui-quiz-chords">
            {named.map((c) => (
              <MasteryRing key={c.chordId} name={c.name} pct={c.pct} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
