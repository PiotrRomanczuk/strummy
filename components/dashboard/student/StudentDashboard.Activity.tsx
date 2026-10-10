import { getTranslations } from 'next-intl/server';

import { stageLabelKey, type StageKey } from '@/components/songs/SongPrimitives';
import type {
  HomeActivity,
  HomeActivityKind,
} from '@/lib/services/student-home-repertoire-queries';

import { timeAgo } from './student-home.helpers';
import { eyebrow, HomeCard } from './StudentHomePrimitives';

const KIND_COLOR: Record<HomeActivityKind, string> = {
  assignment: 'var(--gold-2)',
  mastered: 'var(--success)',
  stage: 'var(--info)',
  practice: 'var(--ink-2)',
};

/** "Activity": assignments set, stage changes and logged practice, newest first. */
export async function StudentActivityCard({ items, now }: { items: HomeActivity[]; now: Date }) {
  const t = await getTranslations('StudentHome');
  const ts = await getTranslations('Songs');

  const describe = (a: HomeActivity): [string, string] => {
    switch (a.kind) {
      case 'assignment':
        return [
          a.actor ? t('actAssigned', { name: a.actor.split(' ')[0] }) : t('actAssignedAnon'),
          `“${a.object}”`,
        ];
      case 'mastered':
        return [t('actMastered'), `“${a.object}”`];
      case 'stage':
        return [
          t('actStage'),
          `“${a.object}” ${t('actStageTo', { stage: ts(stageLabelKey(a.stage as StageKey)) })}`,
        ];
      default:
        return [t('actPractice'), t('actPracticeMinutes', { minutes: a.object })];
    }
  };

  return (
    <HomeCard>
      <div style={{ ...eyebrow, marginBottom: 12 }}>{t('activity')}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{t('noActivity')}</div>
      ) : (
        items.map((a, i) => {
          const [label, object] = describe(a);
          const color = KIND_COLOR[a.kind];
          return (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px minmax(0,1fr) auto',
                gap: 12,
                alignItems: 'flex-start',
                padding: '10px 0',
                borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  marginTop: 5,
                }}
              />
              <div style={{ fontSize: 12, lineHeight: 1.45 }}>
                <span style={{ color, fontWeight: 500 }}>{label}</span>{' '}
                <span style={{ color: 'var(--ink-2)' }}>{object}</span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('agoShort', { time: timeAgo(a.at, now) })}
              </div>
            </div>
          );
        })
      )}
    </HomeCard>
  );
}
