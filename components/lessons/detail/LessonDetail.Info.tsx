import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { LessonDetail } from '@/lib/services/lesson-detail-queries';

import { StudentInitials } from '../LessonPrimitives';
import { Card, CardHeader, InfoRow } from './LessonDetailPrimitives';
import {
  formatLessonClockShort,
  formatLessonDuration,
  formatLessonFormat,
} from '../lesson-format.helpers';

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
      <div style={{ padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InfoRow label={t('fieldScheduled')}>
          <span style={mono13}>
            {new Date(lesson.scheduledAt).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span style={{ ...mono13, color: 'var(--ink-4)', marginLeft: 8 }}>
            · {formatLessonClockShort(lesson.scheduledAt)}
          </span>
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
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <StudentInitials
              name={lesson.studentName}
              email={lesson.studentEmail}
              color={lesson.studentColor}
              size={22}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{studentDisplay}</div>
              {lesson.studentLevel && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--mono)',
                    textTransform: 'capitalize',
                  }}
                >
                  {lesson.studentLevel}
                </div>
              )}
            </div>
          </Link>
        </InfoRow>
        <InfoRow label={t('fieldTeacher')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StudentInitials
              name={lesson.teacherName}
              email={null}
              color={lesson.teacherColor}
              size={22}
            />
            <span style={{ fontSize: 13 }}>{lesson.teacherName ?? t('teacherFallback')}</span>
          </div>
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
