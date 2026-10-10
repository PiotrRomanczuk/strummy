'use client';

import { CheckCircle2, Flame, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StudentRecentLesson } from '@/lib/services/student-detail-queries';
import type { PracticeSessionRow } from '@/lib/services/student-health-queries';
import { relativeDays } from '@/components/assignments/assignment-row.helpers';
import { SdCard, SdRow } from './StudentDetail.Panel';

type Item = {
  at: string;
  tone: 'gold' | 'success' | 'danger';
  icon: React.ReactNode;
  title: string;
  sub: string;
};

const TILE: Record<Item['tone'], { bg: string; fg: string }> = {
  gold: { bg: 'var(--gold-tint)', fg: 'var(--gold-2)' },
  success: { bg: 'color-mix(in srgb, var(--success) 12%, var(--card))', fg: 'var(--success)' },
  danger: { bg: 'color-mix(in srgb, var(--danger) 12%, var(--card))', fg: 'var(--danger)' },
};

/** "Recent activity": practice sessions and past lessons, newest first. */
export const StudentActivity = ({
  sessions,
  lessons,
  now,
}: {
  sessions: PracticeSessionRow[];
  lessons: StudentRecentLesson[];
  now: number;
}) => {
  const t = useTranslations('Users');
  const items: Item[] = [
    ...sessions.map((s) => ({
      at: s.createdAt,
      tone: 'gold' as const,
      icon: <Flame size={17} strokeWidth={2} />,
      title: t('detailActivityPractice', { minutes: s.durationMinutes }),
      sub: s.songTitle ?? s.notes ?? '',
    })),
    ...lessons
      .filter((l) => Date.parse(l.scheduledAt) < now)
      .map((l) => {
        const done = l.status.toLowerCase() === 'completed';
        return {
          at: l.scheduledAt,
          tone: done ? ('success' as const) : ('danger' as const),
          icon: done ? <CheckCircle2 size={17} strokeWidth={2} /> : <X size={17} strokeWidth={2} />,
          title: done ? t('detailActivityLessonDone') : t('detailActivityLessonMissed'),
          sub: l.title ?? '',
        };
      }),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 4);

  return (
    <SdCard title={t('detailRecentActivity')}>
      {items.length === 0 && (
        <div
          style={{
            padding: '16px 20px',
            fontStyle: 'italic',
            color: 'var(--ink-4)',
            fontFamily: 'var(--serif)',
          }}
        >
          {t('detailActivityEmpty')}
        </div>
      )}
      {items.map((a, i) => (
        <SdRow key={i} isLast={i === items.length - 1}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: TILE[a.tone].bg,
              color: TILE[a.tone].fg,
            }}
          >
            {a.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</div>
            {a.sub && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--ink-4)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.sub}
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
            {relativeDays(a.at)}
          </span>
        </SdRow>
      ))}
    </SdCard>
  );
};
