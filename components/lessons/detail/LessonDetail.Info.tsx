import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonDetail } from '@/lib/services/lesson-detail-queries';

import { Card, CardHeader, InfoRow, formatLong } from './LessonDetailPrimitives';
import { formatLessonDuration, formatLessonFormat } from '../lesson-format.helpers';

const mono13 = { fontFamily: 'var(--mono)', fontSize: 13 } as const;

export const LessonInfoCard = async ({
  lesson,
  studentDisplay,
  counterpartFirstName,
}: {
  lesson: LessonDetail;
  studentDisplay: string;
  counterpartFirstName: string;
}) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader eyebrow={t('detailsEyebrow')} title={t('lessonInfoTitle')} />
      <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <InfoRow label={t('fieldScheduled')}>
          <span style={mono13}>{formatLong(lesson.scheduledAt)}</span>
        </InfoRow>
        {formatLessonDuration(lesson.durationMinutes) && (
          <InfoRow label={t('fieldDuration')}>
            <span style={mono13}>{formatLessonDuration(lesson.durationMinutes)}</span>
          </InfoRow>
        )}
        {formatLessonFormat(lesson.format) && (
          <InfoRow label={t('fieldFormat')}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {formatLessonFormat(lesson.format)}
            </span>
          </InfoRow>
        )}
        <InfoRow label={t('fieldStudent')}>
          <Link
            href={`/dashboard/users/${lesson.studentId}`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              {studentDisplay}
            </div>
            {lesson.studentName && lesson.studentEmail && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {lesson.studentEmail}
              </div>
            )}
          </Link>
        </InfoRow>
        <InfoRow label={t('fieldTeacher')}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{lesson.teacherName ?? t('teacherFallback')}</span>
        </InfoRow>
        <InfoRow label={t('fieldSequence')}>
          <span style={mono13}>
            {lesson.lessonTeacherNumber != null
              ? t('sequenceWithNumber', {
                  number: lesson.lessonTeacherNumber,
                  name: counterpartFirstName,
                })
              : t('sequenceWithoutNumber', { name: counterpartFirstName })}
          </span>
        </InfoRow>
      </div>
    </Card>
  );
};
