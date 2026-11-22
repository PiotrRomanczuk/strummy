import { useLocale, useTranslations } from 'next-intl';

import { BillingHomeCard } from '@/components/billing/BillingHomeCard';
import type { BillingSummary } from '@/lib/services/billing/family-billing.helpers';
import type { UpcomingLesson } from '@/lib/services/parent-health-queries';

import { Card, CardHeader, ComingSoonBody } from '../DashboardPrimitives';
import { Badge, formatLessonDate } from './parent-dashboard.shared';

const LessonRow = ({
  lesson,
  isNext,
  isLast,
}: {
  lesson: UpcomingLesson;
  isNext: boolean;
  isLast: boolean;
}) => {
  const t = useTranslations('ParentHome');
  const locale = useLocale();
  const { mo, day, time, weekday } = formatLessonDate(lesson.scheduledAt, locale);
  return (
    <div
      className="ui-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule-2)',
        background: isNext ? 'var(--gold-tint)' : 'transparent',
      }}
    >
      <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            letterSpacing: '.08em',
          }}
        >
          {mo}
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            fontWeight: 500,
            lineHeight: 1,
            color: isNext ? 'var(--gold-2)' : 'var(--ink)',
          }}
        >
          {day}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{lesson.title ?? t('lessonFallback')}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
          {weekday} · {time}
          {lesson.teacherName ? ` · ${lesson.teacherName}` : ''}
        </div>
      </div>
      {isNext && <Badge tone="gold">{t('lessonNext')}</Badge>}
    </div>
  );
};

export const ParentUpcomingLessonsCard = ({ lessons }: { lessons: UpcomingLesson[] }) => {
  const t = useTranslations('ParentHome');
  return (
    <Card>
      <CardHeader eyebrow={t('lessonsEyebrow')} title={t('lessonsTitle')} />
      {lessons.length === 0 ? (
        <ComingSoonBody note={t('lessonsEmpty')} />
      ) : (
        <div>
          {lessons.map((lesson, i) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              isNext={i === 0}
              isLast={i === lessons.length - 1}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

/** The active child's billing; a short note when their teacher does not use billing in Strummy. */
export const ParentBillingCard = ({
  childId,
  summary,
}: {
  childId: string;
  summary: BillingSummary | null;
}) => {
  const t = useTranslations('Billing');
  return (
    <BillingHomeCard
      summary={summary}
      href={`/dashboard/billing?child=${childId}`}
      emptyNote={t('parentEmpty')}
    />
  );
};
