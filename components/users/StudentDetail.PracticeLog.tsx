'use client';

import { useTranslations } from 'next-intl';

import type { PracticeSessionRow } from '@/lib/services/student-health-queries';
import { Card, CardHeader, Empty, formatDate, formatMinutes } from './StudentDetail.shared';

type Props = { sessions: PracticeSessionRow[] };

/** Raw practice-session log — date, song, minutes, optional note. */
export const PracticeLogCard = ({ sessions }: Props) => {
  const t = useTranslations('Users');

  return (
    <Card>
      <CardHeader eyebrow={t('detailPracticeLogEyebrow')} title={t('detailPracticeLogTitle')} />
      {sessions.length === 0 ? (
        <Empty>{t('detailPracticeLogEmpty')}</Empty>
      ) : (
        <div>
          {sessions.map((session, i) => (
            <div
              key={session.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'baseline',
                padding: '12px 22px',
                borderBottom: i < sessions.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                }}
              >
                {formatDate(session.createdAt)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13 }}>
                  {session.songTitle ?? t('detailPracticeLogFreePracticeFallback')}
                </div>
                {session.notes && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {session.notes}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  fontWeight: 500,
                }}
              >
                {formatMinutes(session.durationMinutes)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
