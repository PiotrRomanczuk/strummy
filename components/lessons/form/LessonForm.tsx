'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { FormSection } from '@/components/shared/FormSection';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import { WEEK_OPTIONS } from '@/schemas/RecurringLessonSchema';
import type { LessonFormat } from '@/schemas/LessonSchema';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { LessonFormFieldsWhoWhen } from './LessonForm.Fields.WhoWhen';
import { LessonFormFieldsSongsNotes } from './LessonForm.Fields.SongsNotes';
import { LessonFormPreview } from './LessonForm.Preview';
import { LessonFormRecurring } from './LessonForm.Recurring';
import { LessonNotesAI } from '@/components/lessons/form/LessonNotesAI';
import { SHOW_AI_FEATURES } from '@/lib/config/features';
import { useLessonFormSubmit } from './useLessonFormSubmit';

const NEW_STUDENT = '__new__';
const DEFAULT_DURATION_MINUTES = 45;
const DEFAULT_FORMAT: LessonFormat = 'in_person';

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  songs: SongOption[];
  /** Create-mode prefill, e.g. arriving from a student's "Schedule lesson". */
  defaultStudentId?: string;
  initial?: {
    lessonId: string;
    studentId: string;
    title: string | null;
    notes: string | null;
    scheduledAt: string;
    status: string;
    durationMinutes: number | null;
    format: string | null;
    songIds: string[];
  };
};

const toFormat = (value: string | null | undefined): LessonFormat =>
  value === 'video' ? 'video' : DEFAULT_FORMAT;

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const LessonForm = ({ mode, students, songs, defaultStudentId, initial }: Props) => {
  const t = useTranslations('Lessons');
  const [studentId, setStudentId] = useState(initial?.studentId ?? defaultStudentId ?? '');
  const [studentEmail, setStudentEmail] = useState('');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [scheduledLocal, setScheduledLocal] = useState(
    initial ? toLocalInput(initial.scheduledAt) : ''
  );
  const [status, setStatus] = useState(initial?.status ?? 'SCHEDULED');
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initial?.durationMinutes ?? DEFAULT_DURATION_MINUTES
  );
  const [format, setFormat] = useState<LessonFormat>(toFormat(initial?.format));
  const [songIds, setSongIds] = useState<string[]>(initial?.songIds ?? []);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState<number>(WEEK_OPTIONS[0].value);

  const isNewStudent = studentId === NEW_STUDENT;

  const selectedStudent = students.find((stu) => stu.id === studentId);
  const aiStudentName = isNewStudent ? studentEmail : (selectedStudent?.name ?? '');
  const aiSongsCovered = songIds
    .map((id) => songs.find((song) => song.id === id)?.title)
    .filter((t): t is string => Boolean(t));

  const { error, isSaving, handleSubmit } = useLessonFormSubmit({
    mode,
    initialLessonId: initial?.lessonId,
    isNewStudent,
    studentId,
    studentEmail,
    title,
    notes,
    scheduledLocal,
    status,
    durationMinutes,
    format,
    songIds,
    repeatWeekly,
    repeatWeeks,
  });

  return (
    <div style={s.page}>
      <form style={{ maxWidth: 1040, margin: '0 auto' }} onSubmit={handleSubmit}>
        <div style={s.eyebrow}>{mode === 'edit' ? t('editLesson') : t('newLessonEyebrow')}</div>
        <h1 style={s.title}>{mode === 'edit' ? t('editLesson') : t('scheduleLessonTitle')}</h1>

        {error && <div style={s.error}>{error}</div>}

        <div className="ui-grid-form">
          <div>
            <FormSection
              numeral={t('numeralWhoWhen')}
              title={t('sectionStudentSchedule')}
              count={mode === 'create' ? 4 : 3}
              // Edit mode doesn't expose the student field, so it must not be
              // counted either — otherwise the badge reads an impossible "4/3".
              populated={
                [
                  ...(mode === 'create' ? [studentId || studentEmail] : []),
                  title,
                  scheduledLocal,
                  status,
                ].filter(Boolean).length
              }
            >
              <LessonFormFieldsWhoWhen
                mode={mode}
                students={students}
                newStudentValue={NEW_STUDENT}
                studentId={studentId}
                studentEmail={studentEmail}
                title={title}
                scheduledLocal={scheduledLocal}
                status={status}
                durationMinutes={durationMinutes}
                format={format}
                onStudentId={setStudentId}
                onStudentEmail={setStudentEmail}
                onTitle={setTitle}
                onScheduled={setScheduledLocal}
                onStatus={setStatus}
                onDurationMinutes={setDurationMinutes}
                onFormat={setFormat}
              />
            </FormSection>

            {mode === 'create' && (
              <FormSection
                numeral={t('numeralRepeat')}
                title={t('sectionRecurrence')}
                count={1}
                populated={1}
              >
                <LessonFormRecurring
                  repeatWeekly={repeatWeekly}
                  weeks={repeatWeeks}
                  disabled={isSaving}
                  onRepeatWeekly={setRepeatWeekly}
                  onWeeks={setRepeatWeeks}
                />
              </FormSection>
            )}

            <FormSection
              numeral={t('numeralPlan')}
              title={t('sectionSongsNotes')}
              count={songs.length}
              populated={songIds.length}
            >
              <LessonFormFieldsSongsNotes
                songs={songs}
                songIds={songIds}
                notes={notes}
                onSongIds={setSongIds}
                onNotes={setNotes}
              />
            </FormSection>

            {SHOW_AI_FEATURES && (
              <div data-testid="lesson-notes-ai">
                <LessonNotesAI
                  studentName={aiStudentName}
                  studentId={isNewStudent ? undefined : studentId || undefined}
                  songsCovered={aiSongsCovered}
                  lessonTopic={title}
                  onNotesGenerated={setNotes}
                  disabled={isSaving}
                />
              </div>
            )}
          </div>

          <FormPreviewPanel>
            <LessonFormPreview
              student={selectedStudent}
              studentEmail={studentEmail}
              scheduledLocal={scheduledLocal}
              durationMinutes={durationMinutes}
              songs={songs}
              songIds={songIds}
            />
          </FormPreviewPanel>
        </div>

        <div style={s.actions}>
          <button type="submit" style={s.primary} disabled={isSaving}>
            {isSaving ? t('saving') : mode === 'edit' ? t('saveChanges') : t('createLesson')}
          </button>
          <Link
            href={initial ? `/dashboard/lessons/${initial.lessonId}` : '/dashboard/lessons'}
            style={s.cancel}
          >
            {t('cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
};
