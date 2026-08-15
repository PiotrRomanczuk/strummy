import { getTranslations } from 'next-intl/server';

import { Card, CardHeader, StageStepper } from './SongPrimitives';

import { firstNameWithInitial, minutesLabel, monthYear } from './song-format.helpers';
import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import { WantToLearnButton } from './WantToLearnButton';

export { QuickAssignCard } from './SongSidebar.QuickAssignCard';
import type {
  RelatedSongRow,
  SongLearner,
  SongUsageStats,
  ViewerSongEntry,
} from '@/lib/services/song-detail-queries';

const SidebarStat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingBottom: 10,
      borderBottom: '1px solid var(--rule-2)',
    }}
  >
    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{value}</span>
      {unit && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          {unit}
        </span>
      )}
    </span>
  </div>
);

export const UsageCard = async ({ stats }: { stats: SongUsageStats }) => {
  const t = await getTranslations('Songs');
  return (
    <Card>
      <CardHeader eyebrow={t('usageEyebrow')} title={t('usageTitle')} />
      <div
        style={{
          padding: '0 24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <SidebarStat
          label={t('statAssignedTo')}
          value={String(stats.assignedTo)}
          unit={t('unitStudents')}
        />
        <SidebarStat
          label={t('statLessonsFeaturedIn')}
          value={String(stats.usedInLessons)}
          unit={t('unitLessons')}
        />
        <SidebarStat label={t('statInLibrarySince')} value={monthYear(stats.inLibrarySince, t)} />
        <SidebarStat label={t('statAvgMastery')} value={String(stats.avgMastery)} unit="%" />
      </div>
    </Card>
  );
};

export const LearnersCard = async ({ learners }: { learners: SongLearner[] }) => {
  const t = await getTranslations('Songs');
  return (
    <Card>
      <CardHeader
        eyebrow={t('learningEyebrow')}
        title={t('studentsTitle')}
        action={
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            {learners.length}
          </span>
        }
      />
      <div style={{ padding: '0 24px 22px' }}>
        {learners.length === 0 ? (
          <div
            style={{
              fontStyle: 'italic',
              color: 'var(--ink-4)',
              fontFamily: 'var(--serif)',
              fontSize: 14,
              padding: '4px 0 8px',
            }}
          >
            {t('noActiveLearners')}
          </div>
        ) : (
          learners.map((row, i) => {
            const displayName = firstNameWithInitial(
              row.fullName,
              row.email ?? t('studentFallback')
            );
            return (
              <div
                key={row.studentId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 60px',
                  gap: 10,
                  padding: '10px 0',
                  alignItems: 'center',
                  borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                <StageStepper status={row.status} size="sm" t={t} />
                <span
                  style={{
                    textAlign: 'right',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-4)',
                  }}
                >
                  {minutesLabel(row.totalPracticeMinutes)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

/**
 * Student-facing replacement for Usage/Learners: the viewer's own journey on
 * this song, not studio analytics phrased for teachers.
 *
 * Reads `entry` (the viewer's own repertoire row) rather than the first
 * element of the teacher-facing learners list, which excludes `to_learn` and
 * so could never represent a "want to learn" pick.
 */
export const YourProgressCard = async ({
  entry,
  songId,
  canPick,
}: {
  entry: ViewerSongEntry | null;
  songId: string;
  /** False for non-students (a teacher previewing their own song page). */
  canPick: boolean;
}) => {
  const t = await getTranslations('Songs');
  return (
    <Card>
      <CardHeader eyebrow={t('yourPracticeEyebrow')} title={t('progressTitle')} />
      <div style={{ padding: '0 24px 22px' }}>
        {entry ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StageStepper status={entry.status} t={t} />
            {/* Practice time is off at the flag (#614); the stage stepper and
                the pick control are independent of it. */}
            {SHOW_PRACTICE_FEATURES && (
              <SidebarStat
                label={t('statPracticeTime')}
                value={minutesLabel(entry.totalPracticeMinutes)}
                unit={t('unitTotal')}
              />
            )}
            {canPick && entry.isRemovable && (
              <WantToLearnButton songId={songId} initial={{ kind: 'added-removable' }} />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>
            <div
              style={{
                fontStyle: 'italic',
                color: 'var(--ink-4)',
                fontFamily: 'var(--serif)',
                fontSize: 14,
              }}
            >
              {/* A parent also lands on this card and has no pick action, so
                  they keep the original "ask your teacher" wording. */}
              {canPick ? t('notInRepertoirePickable') : t('notInRepertoire')}
            </div>
            {canPick && <WantToLearnButton songId={songId} initial={{ kind: 'absent' }} />}
          </div>
        )}
      </div>
    </Card>
  );
};

export const RelatedCard = async ({ related }: { related: RelatedSongRow[] }) => {
  if (related.length === 0) return null;
  const t = await getTranslations('Songs');
  return (
    <Card>
      <CardHeader eyebrow={t('similarLevelEyebrow')} title={t('relatedTitle')} />
      <div
        style={{
          padding: '0 24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {related.map((r, i) => (
          <a
            key={r.id}
            href={`/dashboard/songs/${r.id}`}
            className="ui-row"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < related.length - 1 ? '1px solid var(--rule-2)' : 'none',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'linear-gradient(135deg, var(--gold-dim), var(--gold-2))',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontFamily: 'var(--serif)',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {r.songKey ?? '·'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}
              >
                {r.title}
              </div>
              {r.author && (
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    color: 'var(--ink-4)',
                  }}
                >
                  {r.author}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};
