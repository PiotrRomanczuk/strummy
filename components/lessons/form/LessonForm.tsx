'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { FormSection } from '@/components/shared/FormSection';
import { FormPageHeader, FormTitleAccent } from '@/components/shared/FormPageHeader';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import { WEEK_OPTIONS } from '@/schemas/RecurringLessonSchema';
import type { LessonFormat } from '@/schemas/LessonSchema';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { LessonFormFieldsWhoWhen } from './LessonForm.Fields.WhoWhen';
import { LessonFormFieldsSongs } from './LessonForm.Fields.Songs';
import { LessonFormFieldsNotes } from './LessonForm.Fields.Notes';
import { LessonFormFormatToggle } from './LessonForm.Fields.Format';
import { LessonFormStatus } from './LessonForm.Status';
import { splitLocal } from './lesson-form.helpers';
import { LessonFormPreview } from './LessonForm.Preview';
import { LessonFormRecurring } from './LessonForm.Recurring';
import { LessonNotesAI } from '@/components/lessons/form/LessonNotesAI';
import { SHOW_AI_FEATURES } from '@/lib/config/features';
import { useLessonFormSubmit } from './useLessonFormSubmit';

const NEW_STUDENT = '__new__';
const FORM_ID = 'lesson-form';

const splitParts = (local: string): string[] => {
  const { date, time } = splitLocal(local);
  return [date, time];
};
const DEFAULT_DURATION_MINUTES = 45;
const DEFAULT_FORMAT: LessonFormat = 'in_person';

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  songs: SongOption[];
  /** Create-mode prefill, e.g. arriving from a student's "Schedule lesson". */
  defaultStudentId?: string;
  /** Create-mode prefill from the list's "Recurring…" button. */
  defaultRepeatWeekly?: boolean;
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

export const LessonForm = ({
  mode,
  students,
  songs,
  defaultStudentId,
  defaultRepeatWeekly = false,
  initial,
}: Props) => {
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
  const [repeatWeekly, setRepeatWeekly] = useState(defaultRepeatWeekly);
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

  const sectionI = [
    ...(mode === 'create' ? [studentId || studentEmail] : []),
    ...splitParts(scheduledLocal),
    durationMinutes,
  ];

  return (
    <div style={s.page}>
      <FormPageHeader
        crumbLabel={t('title')}
        crumbHref="/dashboard/lessons"
        current={mode === 'edit' ? t('editLesson') : t('newLessonShort')}
        title={
          mode === 'edit' ? (
            <>
              {t('formTitleEdit')} <FormTitleAccent>{t('formTitleNoun')}</FormTitleAccent>.
            </>
          ) : (
            <>
              {t('formTitleCreate')} <FormTitleAccent>{t('formTitleNoun')}</FormTitleAccent>.
            </>
          )
        }
        sub={t('formSubtitle')}
        cancelHref={initial ? `/dashboard/lessons/${initial.lessonId}` : '/dashboard/lessons'}
        cancelLabel={t('cancel')}
        submitLabel={
          isSaving ? t('saving') : mode === 'edit' ? t('saveChanges') : t('scheduleLesson')
        }
        formId={FORM_ID}
        isSaving={isSaving}
      />

      {error && <div style={s.error}>{error}</div>}

      <form id={FORM_ID} onSubmit={handleSubmit} className="ui-grid-form">
        <div>
          <FormSection
            numeral={t('numeralWhoWhen')}
            title={t('sectionStudentTime')}
            count={sectionI.length}
            populated={sectionI.filter(Boolean).length}
          >
            <LessonFormFieldsWhoWhen
              mode={mode}
              students={students}
              newStudentValue={NEW_STUDENT}
              studentId={studentId}
              studentEmail={studentEmail}
              scheduledLocal={scheduledLocal}
              durationMinutes={durationMinutes}
              onStudentId={setStudentId}
              onStudentEmail={setStudentEmail}
              onScheduled={setScheduledLocal}
              onDurationMinutes={setDurationMinutes}
            />
          </FormSection>

          <FormSection
            numeral={t('numeralFormat')}
            title={t('sectionLocation')}
            count={2}
            populated={2}
          >
            <div className="ui-form-row-2" style={{ gap: 16 }}>
              <LessonFormFormatToggle value={format} onChange={setFormat} />
              {mode === 'create' ? (
                <LessonFormRecurring
                  repeatWeekly={repeatWeekly}
                  weeks={repeatWeeks}
                  disabled={isSaving}
                  onRepeatWeekly={setRepeatWeekly}
                  onWeeks={setRepeatWeeks}
                />
              ) : (
                <LessonFormStatus value={status} onChange={setStatus} />
              )}
            </div>
          </FormSection>

          <FormSection
            numeral={t('numeralPlan')}
            title={t('sectionSongsToCover')}
            count={songs.length}
            populated={songIds.length}
          >
            <LessonFormFieldsSongs songs={songs} songIds={songIds} onSongIds={setSongIds} />
          </FormSection>

          <FormSection
            numeral={t('numeralNotes')}
            title={t('sectionPlanNotes')}
            count={2}
            populated={[title, notes].filter(Boolean).length}
          >
            <LessonFormFieldsNotes
              title={title}
              notes={notes}
              onTitle={setTitle}
              onNotes={setNotes}
            />
            {SHOW_AI_FEATURES && (
              <div data-testid="lesson-notes-ai" style={{ marginTop: 12 }}>
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
          </FormSection>
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
      </form>
    </div>
  );
};
