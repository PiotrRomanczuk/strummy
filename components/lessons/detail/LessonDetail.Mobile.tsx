import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LessonStatusPill } from '@/components/lessons/LessonPrimitives';
import { formatLessonClockShort } from '@/components/lessons/lesson-format.helpers';
import type { LessonAssignment, LessonDetail } from '@/lib/services/lesson-detail-queries';

import { LessonDateBlock } from './LessonDetail.DateBlock';
import { CounterpartCard, MobileSection, mono } from './LessonDetail.MobileParts';
import { MobileAssignmentRow, MobileSongRow } from './LessonDetail.MobileRows';
import { lessonStatusColour, lessonStatusLabel } from './LessonDetailPrimitives';

type Props = {
  lesson: LessonDetail;
  canEdit: boolean;
  assignments: LessonAssignment[];
  counterpartDisplay: string;
};

/** Claude Design mobile lesson detail: back bar, compact hero, student, songs, notes, assignments. */
export async function LessonDetailMobile({
  lesson,
  canEdit,
  assignments,
  counterpartDisplay,
}: Props) {
  const t = await getTranslations('Lessons');
  const circle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--card)',
    border: '1px solid var(--rule)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--ink-2)',
  } as const;
  const time = [
    formatLessonClockShort(lesson.scheduledAt),
    lesson.durationMinutes ? `${lesson.durationMinutes}m` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <div style={{ padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/dashboard/lessons" aria-label={t('mobileBack')} style={circle}>
          <ArrowLeft size={13} />
        </Link>
        {lesson.lessonTeacherNumber != null && (
          <span style={mono}>
            {t('mobileLessonNumber', { number: lesson.lessonTeacherNumber })}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {canEdit && (
          <Link
            href={`/dashboard/lessons/${lesson.id}/edit`}
            aria-label={t('editLesson')}
            style={{ ...circle, borderRadius: 8, width: 30, height: 28 }}
          >
            <Pencil size={12} />
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <LessonDateBlock iso={lesson.scheduledAt} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <LessonStatusPill
            label={lessonStatusLabel(lesson.status, t, lesson.scheduledAt)}
            colour={lessonStatusColour(lesson.status, lesson.scheduledAt)}
          />
          <h1
            style={{
              margin: '6px 0 4px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontStyle: lesson.title ? 'normal' : 'italic',
              color: lesson.title ? 'var(--ink)' : 'var(--ink-4)',
            }}
          >
            {lesson.title ?? t('untitledLesson')}
          </h1>
          <div style={mono}>{time}</div>
        </div>
      </div>

      <CounterpartCard lesson={lesson} canEdit={canEdit} counterpartDisplay={counterpartDisplay} />

      {lesson.songs.length > 0 && (
        <MobileSection title={t('mobileSongs')} count={lesson.songs.length}>
          {lesson.songs.map((s, i) => (
            <MobileSongRow key={s.songId} s={s} i={i} lessonId={lesson.id} canEdit={canEdit} />
          ))}
        </MobileSection>
      )}

      <MobileSection title={t('mobileNotes')}>
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--ink-2)',
            whiteSpace: 'pre-line',
          }}
        >
          {lesson.notes?.trim() || <em style={{ color: 'var(--ink-4)' }}>{t('noNotesShort')}</em>}
        </div>
      </MobileSection>

      {assignments.length > 0 && (
        <MobileSection title={t('mobileAssignments')} count={assignments.length}>
          {assignments.map((a, i) => (
            <MobileAssignmentRow
              key={a.id}
              a={a}
              i={i}
              dueLabel={(date) => t('mobileDue', { date })}
            />
          ))}
        </MobileSection>
      )}
    </div>
  );
}
