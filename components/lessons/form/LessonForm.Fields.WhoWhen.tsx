'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/_ui/form-styles';
import type { StudentOption } from '@/lib/services/lesson-form-data';
import type { LessonFormat } from '@/schemas/LessonSchema';
import { LessonFormFormatToggle } from './LessonForm.Fields.Format';

const LESSON_STATUS_KEYS = [
  { value: 'SCHEDULED', labelKey: 'statusScheduled' },
  { value: 'IN_PROGRESS', labelKey: 'statusInProgress' },
  { value: 'COMPLETED', labelKey: 'statusCompleted' },
  { value: 'CANCELLED', labelKey: 'statusCancelled' },
];

const DURATION_OPTIONS = [30, 45, 60];

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  newStudentValue: string;
  studentId: string;
  studentEmail: string;
  title: string;
  scheduledLocal: string;
  status: string;
  durationMinutes: number;
  format: LessonFormat;
  onStudentId: (v: string) => void;
  onStudentEmail: (v: string) => void;
  onTitle: (v: string) => void;
  onScheduled: (v: string) => void;
  onStatus: (v: string) => void;
  onDurationMinutes: (v: number) => void;
  onFormat: (v: LessonFormat) => void;
};

/** Section I — "who and when": student, title, scheduled time, status. */
export const LessonFormFieldsWhoWhen = ({
  mode,
  students,
  newStudentValue,
  studentId,
  studentEmail,
  title,
  scheduledLocal,
  status,
  durationMinutes,
  format,
  onStudentId,
  onStudentEmail,
  onTitle,
  onScheduled,
  onStatus,
  onDurationMinutes,
  onFormat,
}: Props) => {
  const t = useTranslations('Lessons');
  const isNewStudent = studentId === newStudentValue;

  return (
    <>
      {mode === 'create' && (
        <div style={s.field}>
          <label style={s.label} htmlFor="lesson-student">
            {t('fieldStudent')}
          </label>
          <select
            id="lesson-student"
            style={s.input}
            value={studentId}
            onChange={(e) => onStudentId(e.target.value)}
          >
            <option value="">{t('selectStudentPlaceholder')}</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name ?? st.email ?? t('unnamedFallback')} {st.email ? `· ${st.email}` : ''}
              </option>
            ))}
            <option value={newStudentValue}>{t('newStudentOption')}</option>
          </select>
          {isNewStudent && (
            <>
              <input
                type="email"
                style={{ ...s.input, marginTop: 6 }}
                placeholder={t('studentEmailPlaceholder')}
                value={studentEmail}
                onChange={(e) => onStudentEmail(e.target.value)}
              />
              <span style={s.hint}>{t('newStudentHint')}</span>
            </>
          )}
        </div>
      )}

      <div style={s.field}>
        <label style={s.label} htmlFor="lesson-title">
          {t('colTitle')}
        </label>
        <input
          id="lesson-title"
          style={s.input}
          value={title}
          placeholder={t('titlePlaceholder')}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>

      <div className="ui-form-row-2" style={{ gap: 16 }}>
        <div style={s.field}>
          <label style={s.label} htmlFor="lesson-when">
            {t('fieldScheduled')}
          </label>
          <input
            id="lesson-when"
            type="datetime-local"
            style={s.input}
            value={scheduledLocal}
            onChange={(e) => onScheduled(e.target.value)}
            required
          />
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="lesson-status">
            {t('colStatus')}
          </label>
          <select
            id="lesson-status"
            style={s.input}
            value={status}
            onChange={(e) => onStatus(e.target.value)}
          >
            {LESSON_STATUS_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ui-form-row-2" style={{ gap: 16 }}>
        <div style={s.field}>
          <label style={s.label} htmlFor="lesson-duration">
            {t('fieldDuration')}
          </label>
          <select
            id="lesson-duration"
            style={s.input}
            value={durationMinutes}
            onChange={(e) => onDurationMinutes(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('minutesUnit', { minutes })}
              </option>
            ))}
          </select>
        </div>

        <LessonFormFormatToggle value={format} onChange={onFormat} />
      </div>
    </>
  );
};
