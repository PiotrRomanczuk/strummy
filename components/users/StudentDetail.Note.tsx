'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ToneBadge } from '@/components/shared/ToneBadge';
import type { StudentRecentLesson } from '@/lib/services/student-detail-queries';
import { relativeDays } from '@/components/assignments/assignment-row.helpers';
import { SdCard, SdRow } from './StudentDetail.Panel';

/**
 * "Teacher notes": the notes from the student's latest lessons (there is no
 * separate per-student notes store), newest first, the latest one flagged.
 */
export const TeacherNoteCard = ({ lessons }: { lessons: StudentRecentLesson[] }) => {
  const t = useTranslations('Users');
  const notes = lessons.filter((l) => l.notes && l.notes.trim()).slice(0, 3);
  return (
    <SdCard title={t('detailNoteTitle')}>
      {notes.length === 0 && (
        <div
          style={{
            padding: '16px 20px',
            fontStyle: 'italic',
            color: 'var(--ink-4)',
            fontFamily: 'var(--serif)',
          }}
        >
          {t('detailNoteEmpty')}
        </div>
      )}
      {notes.map((n, i) => (
        <SdRow key={n.id} isLast={i === notes.length - 1}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {i === 0 && (
              <div style={{ marginBottom: 8 }}>
                <ToneBadge tone="gold" icon={<Star size={12} />}>
                  {t('detailNoteLatest')}
                </ToneBadge>
              </div>
            )}
            <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{n.notes}</div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-4)',
                marginTop: 6,
                fontFamily: 'var(--mono)',
                display: 'flex',
                gap: 10,
              }}
            >
              <span>{relativeDays(n.scheduledAt)}</span>
              <Link
                href={`/dashboard/lessons/${n.id}`}
                style={{ color: 'var(--gold-2)', textDecoration: 'none' }}
              >
                {t('detailNoteOpenLessonLink')}
              </Link>
            </div>
          </div>
        </SdRow>
      ))}
    </SdCard>
  );
};
