import { getTranslations } from 'next-intl/server';

import { LessonStatusPill } from '@/components/lessons/LessonPrimitives';
import type { LessonDetail } from '@/lib/services/lesson-detail-queries';
import { formatLessonClockShort } from '../lesson-format.helpers';
import { LessonDateBlock } from './LessonDetail.DateBlock';
import { lessonStatusColour, lessonStatusLabel } from './LessonDetailPrimitives';

const MetaItem = ({ label, value, isMono }: { label: string; value: string; isMono?: boolean }) => (
  <span>
    <span style={{ color: 'var(--ink-4)' }}>{label} · </span>
    <span style={isMono ? { fontFamily: 'var(--mono)' } : undefined}>{value}</span>
  </span>
);

/** Claude Design lesson hero: date block, status/number/"with", 34px title, meta line. */
export const LessonHero = async ({
  lesson,
  counterpartDisplay,
}: {
  lesson: LessonDetail;
  counterpartDisplay: string;
}) => {
  const t = await getTranslations('Lessons');
  const colour = lessonStatusColour(lesson.status, lesson.scheduledAt);
  const time = [
    formatLessonClockShort(lesson.scheduledAt),
    lesson.durationMinutes ? `${lesson.durationMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div style={{ padding: '22px 0 18px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <LessonDateBlock iso={lesson.scheduledAt} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <LessonStatusPill
            label={lessonStatusLabel(lesson.status, t, lesson.scheduledAt)}
            colour={colour}
          />
          {lesson.lessonTeacherNumber != null && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                padding: '2px 8px',
                background: 'var(--rule-2)',
                borderRadius: 4,
              }}
            >
              {t('lessonNumberBadge', { number: lesson.lessonTeacherNumber })}
            </span>
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            {t('with')} {counterpartDisplay.split(' ')[0]}
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: '-0.02em',
            lineHeight: 1.08,
            fontStyle: lesson.title ? 'normal' : 'italic',
            color: lesson.title ? 'var(--ink)' : 'var(--ink-4)',
          }}
        >
          {lesson.title ?? t('untitledLesson')}
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 18,
            marginTop: 10,
            fontSize: 12,
            color: 'var(--ink-3)',
            flexWrap: 'wrap',
          }}
        >
          <MetaItem label={t('metaTime')} value={time} isMono />
          <MetaItem
            label={t('colStudent')}
            value={lesson.studentName ?? lesson.studentEmail ?? t('studentFallback')}
          />
          {lesson.teacherName && <MetaItem label={t('colTeacher')} value={lesson.teacherName} />}
        </div>
      </div>
    </div>
  );
};
