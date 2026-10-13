import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { LessonStatusPill } from '@/components/lessons/LessonPrimitives';
import { formatLessonClockShort } from '@/components/lessons/lesson-format.helpers';
import type { LessonAssignment, LessonDetail } from '@/lib/services/lesson-detail-queries';
import type { SongOption } from '@/lib/services/lesson-form-data';

import { LessonAddSong } from './LessonDetail.AddSong';
import { LessonAddAssignmentLink } from './LessonDetail.Assignments';

import { LessonDateBlock } from './LessonDetail.DateBlock';
import { CounterpartCard, MobileSection, mono } from './LessonDetail.MobileParts';
import { MobileAssignmentRow, MobileSongRow } from './LessonDetail.MobileRows';
import { lessonStatusColour, lessonStatusLabel } from './LessonDetailPrimitives';

type Props = {
  lesson: LessonDetail;
  canEdit: boolean;
  assignments: LessonAssignment[];
  counterpartDisplay: string;
  /** Song library for "+ Add song" (staff only; empty for students). */
  library?: SongOption[];
};

/** `Users.skillLevel*` per stored level; an unknown level shows as stored. */
const LEVEL_KEYS: Record<string, string> = {
  beginner: 'skillLevelBeginner',
  intermediate: 'skillLevelIntermediate',
  advanced: 'skillLevelAdvanced',
};

const emptyLine = {
  margin: '10px 0 0',
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--ink-4)',
} as const;

/**
 * Claude Design mobile lesson detail: back bar, compact hero, student, songs,
 * notes, assignments. Songs and Assignments always render — with an empty line
 * and, for staff, the add control. Hiding them when empty left a lesson that
 * had not been planned yet as a name and a date on a blank phone screen, which
 * is the screen the whole "lesson is a record" promise rests on.
 */
export async function LessonDetailMobile({
  lesson,
  canEdit,
  assignments,
  counterpartDisplay,
  library = [],
}: Props) {
  const [t, tUsers] = await Promise.all([getTranslations('Lessons'), getTranslations('Users')]);
  const locale = await getLocale();
  const levelKey = lesson.studentLevel ? LEVEL_KEYS[lesson.studentLevel.toLowerCase()] : null;
  const levelLabel = levelKey ? tUsers(levelKey) : lesson.studentLevel;
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
    formatLessonClockShort(lesson.scheduledAt, locale),
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
        <LessonDateBlock iso={lesson.scheduledAt} size="md" locale={locale} />
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

      <CounterpartCard
        lesson={lesson}
        canEdit={canEdit}
        counterpartDisplay={counterpartDisplay}
        levelLabel={levelLabel}
      />

      <MobileSection
        title={t('mobileSongs')}
        count={lesson.songs.length}
        action={
          canEdit && library.length > 0 ? (
            <LessonAddSong
              lessonId={lesson.id}
              currentIds={lesson.songs.map((s) => s.songId)}
              library={library}
            />
          ) : undefined
        }
      >
        {lesson.songs.length === 0 ? (
          <p style={emptyLine}>{t('noSongsAttached')}</p>
        ) : (
          lesson.songs.map((s, i) => (
            <MobileSongRow key={s.songId} s={s} i={i} lessonId={lesson.id} canEdit={canEdit} />
          ))
        )}
      </MobileSection>

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

      <MobileSection
        title={t('mobileAssignments')}
        count={assignments.length}
        action={canEdit ? <LessonAddAssignmentLink studentId={lesson.studentId} /> : undefined}
      >
        {assignments.length === 0 ? (
          <p style={emptyLine}>{t('noHomework')}</p>
        ) : (
          assignments.map((a, i) => (
            <MobileAssignmentRow
              key={a.id}
              a={a}
              i={i}
              dueLabel={(date) => t('mobileDue', { date })}
            />
          ))
        )}
      </MobileSection>
    </div>
  );
}
