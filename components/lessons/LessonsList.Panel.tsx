import { getTranslations } from 'next-intl/server';

import { ListDetailPanel } from '@/components/shared/ListDetailPanel';
import type { LessonRow } from '@/lib/services/lessons-queries';
import { lessonStatusColour, lessonStatusLabel } from '@/lib/services/lessons-queries';
import { getLessonDetail } from '@/lib/services/lesson-detail-queries';

import {
  formatLessonClock,
  formatLessonDate,
  formatLessonDuration,
  formatLessonWeekday,
} from './lesson-format.helpers';
import { LessonStatusPill, StudentInitials } from './LessonPrimitives';
import { buildHref, type LessonsListFilters } from './lessons-list.helpers';

type Props = {
  lesson: LessonRow;
  filters: LessonsListFilters;
  showStudent: boolean;
};

const factLabel = {
  fontFamily: 'var(--mono)',
  fontSize: 9.5,
  color: 'var(--ink-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '.12em',
};

const factValue = { fontSize: 13, color: 'var(--ink)', marginTop: 3 };

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={factLabel}>{label}</div>
    <div style={factValue}>{value}</div>
  </div>
);

type PanelSong = { songId: string; title: string; status: string | null };

const PanelSongs = ({
  songs,
  label,
  emptyLabel,
}: {
  songs: PanelSong[];
  label: string;
  emptyLabel: string;
}) => (
  <div style={{ paddingTop: 16 }}>
    <div style={{ ...factLabel, marginBottom: 8 }}>{label}</div>
    {songs.length === 0 ? (
      <div style={{ fontSize: 12.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>{emptyLabel}</div>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {songs.map((s) => (
          <li
            key={s.songId}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--ink-2)',
              }}
            >
              {s.title}
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-4)',
                flexShrink: 0,
              }}
            >
              {s.status ?? '—'}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/**
 * Slide-in lesson detail. A lighter view of `/dashboard/lessons/[id]` plus the
 * attached-songs list, so a teacher scanning the week can see what a lesson
 * covers without losing their place in the list.
 */
export const LessonsListPanel = async ({ lesson: l, filters, showStudent }: Props) => {
  const t = await getTranslations('Lessons');
  // The list row only carries a song *count*; the titles come from the detail
  // query, which is why the panel is a server component rather than props-only.
  const detail = await getLessonDetail(l.id);
  const songs = detail?.songs ?? [];
  const title = l.title ?? t('untitledLesson');

  return (
    <ListDetailPanel
      label={t('panelLabel', { title })}
      eyebrow={t('panelEyebrow')}
      fullPageHref={`/dashboard/lessons/${l.id}`}
      closeHref={buildHref({ selected: undefined }, filters)}
      labels={{ openFullPage: t('openFullPage'), close: t('closePanel') }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LessonStatusPill
            label={lessonStatusLabel(l.status, t, l.scheduledAt)}
            colour={lessonStatusColour(l.status, l.scheduledAt)}
          />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            #{l.lessonNumber}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          paddingBottom: 16,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Fact
          label={t('colDate')}
          value={`${formatLessonWeekday(l.scheduledAt)} ${formatLessonDate(l.scheduledAt)}`}
        />
        <Fact
          label={t('colTime')}
          value={
            [formatLessonClock(l.scheduledAt), formatLessonDuration(l.durationMinutes)]
              .filter(Boolean)
              .join(' · ') || '—'
          }
        />
      </div>

      {showStudent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 0',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <StudentInitials name={l.studentName} email={l.studentEmail} size={30} />
          <span style={{ fontSize: 13 }}>
            {l.studentName ?? l.studentEmail ?? t('studentFallback')}
          </span>
        </div>
      )}

      <PanelSongs songs={songs} label={t('colSongs')} emptyLabel={t('panelNoSongs')} />
    </ListDetailPanel>
  );
};
