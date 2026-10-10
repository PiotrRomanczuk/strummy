'use client';

import { useTranslations } from 'next-intl';

import { filledInput, formStyles as s } from '@/components/shared/form.styles';
import { StudentPillPicker } from '@/components/shared/StudentPillPicker';
import type { StudentOption } from '@/lib/services/lesson-form-data';
import { joinLocal, splitLocal } from './lesson-form.helpers';

const DURATION_OPTIONS = [30, 45, 60];

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  newStudentValue: string;
  studentId: string;
  studentEmail: string;
  scheduledLocal: string;
  durationMinutes: number;
  onStudentId: (v: string) => void;
  onStudentEmail: (v: string) => void;
  onScheduled: (v: string) => void;
  onDurationMinutes: (v: number) => void;
};

/** Section I — "who & when": student pills, then Date · Time · Duration. */
export const LessonFormFieldsWhoWhen = ({
  mode,
  students,
  newStudentValue,
  studentId,
  studentEmail,
  scheduledLocal,
  durationMinutes,
  onStudentId,
  onStudentEmail,
  onScheduled,
  onDurationMinutes,
}: Props) => {
  const t = useTranslations('Lessons');
  const isNewStudent = studentId === newStudentValue;
  const { date, time } = splitLocal(scheduledLocal);

  return (
    <>
      {mode === 'create' && (
        <div style={s.field}>
          <span style={s.label} id="lesson-student-label">
            {t('fieldStudent')}
            <span style={s.required}>*</span>
          </span>
          <StudentPillPicker
            students={students}
            selectedIds={studentId ? [studentId] : []}
            onToggle={(id) => onStudentId(id === studentId ? '' : id)}
            label={t('fieldStudent')}
            searchPlaceholder={t('searchStudentsPlaceholder')}
            extraPill={{
              label: t('newStudentOption'),
              isActive: isNewStudent,
              onClick: () => onStudentId(isNewStudent ? '' : newStudentValue),
            }}
          />
          {isNewStudent && (
            <>
              <input
                type="email"
                aria-label={t('studentEmailPlaceholder')}
                style={{ ...s.input, marginTop: 8 }}
                placeholder={t('studentEmailPlaceholder')}
                value={studentEmail}
                onChange={(e) => onStudentEmail(e.target.value)}
              />
              <span style={s.hint}>{t('newStudentHint')}</span>
            </>
          )}
        </div>
      )}

      <div className="ui-form-row-3" style={{ gap: 16 }}>
        <div style={{ ...s.field, marginBottom: 0 }}>
          <label style={s.label} htmlFor="lesson-date">
            {t('fieldDate')}
            <span style={s.required}>*</span>
          </label>
          <input
            id="lesson-date"
            type="date"
            style={filledInput(Boolean(date))}
            value={date}
            onChange={(e) => onScheduled(joinLocal(e.target.value, time))}
            required
          />
        </div>
        <div style={{ ...s.field, marginBottom: 0 }}>
          <label style={s.label} htmlFor="lesson-time">
            {t('fieldTime')}
            <span style={s.required}>*</span>
          </label>
          <input
            id="lesson-time"
            type="time"
            style={{ ...filledInput(Boolean(time)), fontFamily: 'var(--mono)' }}
            value={time}
            onChange={(e) => onScheduled(joinLocal(date, e.target.value))}
            required
          />
        </div>
        <div style={{ ...s.field, marginBottom: 0 }}>
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
      </div>
    </>
  );
};
