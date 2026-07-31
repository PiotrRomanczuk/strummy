'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/_ui/FormSection';
import {
  LESSON_DAY_LABELS,
  LESSON_DAY_NUMBERS,
  LESSON_DURATIONS,
  type LessonDayNumber,
} from '@/schemas/StudentIntakeSchema';

import {
  inputStyle,
  monoInputStyle,
  StudentField,
  type StudentSectionProps,
} from './StudentFields.shared';

/** Section III — Schedule: recurring lesson day, time, duration. */
export const StudentFieldsSchedule = ({ values, onChange }: StudentSectionProps) => {
  const t = useTranslations('Users');
  const populated = [
    values.lessonDay ? String(values.lessonDay) : '',
    values.lessonTime,
    String(values.lessonDuration),
  ].filter((v) => v && v.trim()).length;

  return (
    <FormSection
      numeral={t('fieldsScheduleNumeral')}
      title={t('fieldsScheduleTitle')}
      count={3}
      populated={populated}
    >
      <div className="ui-form-row-3">
        <StudentField label={t('fieldsScheduleDayLabel')}>
          <select
            value={values.lessonDay}
            onChange={(e) => onChange('lessonDay', Number(e.target.value) as LessonDayNumber)}
            style={inputStyle}
          >
            {LESSON_DAY_NUMBERS.map((d) => (
              <option key={d} value={d}>
                {LESSON_DAY_LABELS[d]}
              </option>
            ))}
          </select>
        </StudentField>
        <StudentField label={t('fieldsScheduleTimeLabel')}>
          <input
            type="time"
            value={values.lessonTime}
            onChange={(e) => onChange('lessonTime', e.target.value)}
            style={monoInputStyle}
          />
        </StudentField>
        <StudentField label={t('fieldsScheduleDurationLabel')}>
          <select
            value={values.lessonDuration}
            onChange={(e) => onChange('lessonDuration', Number(e.target.value))}
            style={inputStyle}
          >
            {LESSON_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {t('fieldsScheduleDurationMinSuffix', { minutes: d })}
              </option>
            ))}
          </select>
        </StudentField>
      </div>
    </FormSection>
  );
};
