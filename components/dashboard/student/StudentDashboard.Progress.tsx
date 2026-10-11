import { Award, Flame, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { nextStreakBadge, type Achievement } from './student-home.helpers';
import { eyebrow, HomeCard } from './StudentHomePrimitives';

/** "Streak": consecutive practice days and the distance to the next badge. */
export async function StudentStreakCard({ streak }: { streak: number }) {
  const t = await getTranslations('StudentHome');
  const { target, remaining } = nextStreakBadge(streak);
  return (
    <HomeCard style={{ position: 'relative', overflow: 'hidden' }}>
      <Flame
        size={80}
        strokeWidth={1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.5,
          color: 'var(--gold-dim)',
          fill: 'var(--gold-tint)',
        }}
      />
      <div style={{ ...eyebrow, color: 'var(--gold-2)' }}>{t('streak')}</div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 64,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {streak}
        <span style={{ fontSize: 22, color: 'var(--ink-4)', marginLeft: 8, fontStyle: 'italic' }}>
          {t('days')}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
        {t('nextBadge', { remaining })}{' '}
        <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>
          {t('badgeName', { target })}
        </span>
      </div>
      <div
        style={{
          marginTop: 14,
          height: 4,
          background: 'var(--rule-2)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (streak / target) * 100)}%`,
            height: '100%',
            background: 'var(--gold-2)',
            borderRadius: 4,
          }}
        />
      </div>
    </HomeCard>
  );
}

/** "Achievements": milestones derived from practice, streak and repertoire. */
export async function StudentAchievementsCard({
  featured,
  unlocked,
  total,
}: {
  featured: Achievement[];
  unlocked: number;
  total: number;
}) {
  const t = await getTranslations('StudentHome');
  return (
    <HomeCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={eyebrow}>{t('achievements')}</div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {unlocked}/{total}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {featured.map((a) => (
          <div
            key={a.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px minmax(0,1fr) auto',
              gap: 12,
              alignItems: 'center',
              opacity: a.isUnlocked ? 1 : 0.65,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: a.isUnlocked ? 'var(--gold-tint)' : 'var(--rule-2)',
                display: 'grid',
                placeItems: 'center',
                border: a.isUnlocked ? '1px solid var(--gold-dim)' : '1px dashed var(--rule)',
                color: a.isUnlocked ? 'var(--gold-2)' : 'var(--ink-4)',
              }}
            >
              {a.isUnlocked ? <Award size={14} /> : <Sparkles size={14} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t(`ach.${a.key}`)}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{t(`ach.${a.key}Sub`)}</div>
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: a.isUnlocked ? 'var(--success)' : 'var(--ink-4)',
              }}
            >
              {a.isUnlocked ? t('unlocked') : `${a.progress}/${a.max}`}
            </div>
          </div>
        ))}
      </div>
    </HomeCard>
  );
}
