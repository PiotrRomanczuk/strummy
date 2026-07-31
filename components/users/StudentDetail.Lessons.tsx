'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { StudentRecentLesson } from '@/lib/services/student-detail-queries';
import { Card, CardHeader, Empty, formatDate } from './StudentDetail.shared';

type Props = { lessons: StudentRecentLesson[] };

/** Recent lessons list — one row per lesson, linking to the lesson detail. */
export const LessonsCard = ({ lessons }: Props) => {
  const t = useTranslations('Users');

  return (
    <Card>
      <CardHeader eyebrow={t('detailLessonsEyebrow')} title={t('detailTabLessons')} />
      {lessons.length === 0 ? (
        <Empty>{t('detailLessonsEmpty')}</Empty>
      ) : (
        <div>
          {lessons.map((lesson, i) => (
            <Link
              key={lesson.id}
              href={`/dashboard/lessons/${lesson.id}`}
              className="ui-row"
              style={{
                display: 'block',
                padding: '12px 22px',
                borderBottom: i < lessons.length - 1 ? '1px solid var(--rule)' : 'none',
                textDecoration: 'none',
                color: 'inherit',
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
                {formatDate(lesson.scheduledAt)} · {lesson.status}
              </div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {lesson.title ?? t('detailLessonsUntitledFallback')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
};
