'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';

const LESSON_STATUS_KEYS = [
  { value: 'SCHEDULED', labelKey: 'statusScheduled' },
  { value: 'IN_PROGRESS', labelKey: 'statusInProgress' },
  { value: 'COMPLETED', labelKey: 'statusCompleted' },
  { value: 'CANCELLED', labelKey: 'statusCancelled' },
];

/** Edit-mode status select — takes the Repeats slot (recurrence is create-only). */
export const LessonFormStatus = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const t = useTranslations('Lessons');
  return (
    <div style={{ ...s.field, marginBottom: 0 }}>
      <label style={s.label} htmlFor="lesson-status">
        {t('colStatus')}
      </label>
      <select
        id="lesson-status"
        style={s.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {LESSON_STATUS_KEYS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};
