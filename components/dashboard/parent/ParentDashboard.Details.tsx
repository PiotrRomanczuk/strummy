import { useLocale, useTranslations } from 'next-intl';

import type { ParentChildOverview } from '@/lib/services/parent-dashboard-queries';

import { Card, CardHeader, ComingSoonBody } from '../DashboardPrimitives';
import { Badge, formatNoteDate, type BadgeTone } from './parent-dashboard.shared';

type Props = Pick<ParentChildOverview, 'assignments' | 'pastLessons' | 'songs'>;

const ASSIGNMENT_TONE: Record<string, BadgeTone> = {
  completed: 'success',
  overdue: 'danger',
  in_progress: 'gold',
  not_started: 'neutral',
};
const LESSON_TONE: Record<string, BadgeTone> = { COMPLETED: 'success', CANCELLED: 'neutral' };
const SONG_TONE: Record<string, BadgeTone> = { mastered: 'success', with_author: 'success' };

/** A due date is a calendar day: format it in UTC so no time zone moves it. Year only when it is not this year. */
const formatDueDate = (isoDate: string, locale: string) => {
  const day = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const isThisYear = day.getUTCFullYear() === new Date().getUTCFullYear();
  return day.toLocaleDateString(locale.startsWith('pl') ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
};

const Row = ({ title, meta, badge }: { title: string; meta?: string; badge: React.ReactNode }) => (
  <li className="flex items-center justify-between gap-3 border-b border-[var(--rule-2)] px-6 py-3 last:border-b-0">
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-[var(--ink)]">{title}</p>
      {meta && <p className="text-xs text-[var(--ink-4)]">{meta}</p>}
    </div>
    <div className="shrink-0">{badge}</div>
  </li>
);

/** Homework, the lessons that already happened, and the child's songs. */
export const ParentDashboardDetails = ({ assignments, pastLessons, songs }: Props) => {
  const t = useTranslations('ParentHome');
  const locale = useLocale();

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <Card>
        <CardHeader eyebrow={t('homeworkEyebrow')} title={t('homeworkTitle')} />
        {assignments.length === 0 ? (
          <ComingSoonBody note={t('homeworkEmpty')} />
        ) : (
          <ul className="m-0 list-none p-0" data-testid="parent-assignments">
            {assignments.map((a) => (
              <Row
                key={a.id}
                title={a.title ?? t('homeworkUntitled')}
                meta={
                  a.dueDate
                    ? t('homeworkDue', { date: formatDueDate(a.dueDate, locale) })
                    : undefined
                }
                badge={
                  <Badge tone={ASSIGNMENT_TONE[a.status] ?? 'neutral'}>
                    {t(`assignmentStatus.${a.status}`)}
                  </Badge>
                }
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow={t('historyEyebrow')} title={t('historyTitle')} />
        {pastLessons.length === 0 ? (
          <ComingSoonBody note={t('historyEmpty')} />
        ) : (
          <ul className="m-0 list-none p-0" data-testid="parent-past-lessons">
            {pastLessons.map((l) => (
              <Row
                key={l.id}
                title={formatNoteDate(l.scheduledAt, locale)}
                meta={l.title ?? undefined}
                badge={
                  <Badge tone={LESSON_TONE[l.status] ?? 'warn'}>
                    {t(`lessonStatus.${l.status in LESSON_TONE ? l.status : 'OPEN'}`)}
                  </Badge>
                }
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow={t('songsEyebrow')} title={t('songsTitle')} />
        {songs.length === 0 ? (
          <ComingSoonBody note={t('songsEmpty')} />
        ) : (
          <ul className="m-0 list-none p-0" data-testid="parent-songs">
            {songs.slice(0, 8).map((s) => (
              <Row
                key={s.id}
                title={s.title}
                meta={s.author ?? undefined}
                badge={
                  <Badge tone={SONG_TONE[s.status] ?? 'gold'}>{t(`songStatus.${s.status}`)}</Badge>
                }
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
