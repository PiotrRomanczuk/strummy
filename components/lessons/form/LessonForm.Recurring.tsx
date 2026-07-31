'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form-styles';
import { WEEK_OPTIONS } from '@/schemas/RecurringLessonSchema';

const WEEK_LABEL_KEYS: Record<number, string> = {
  4: 'weeks4',
  6: 'weeks6',
  8: 'weeks8',
  12: 'weeks12',
};

type Props = {
  repeatWeekly: boolean;
  weeks: number;
  disabled: boolean;
  onRepeatWeekly: (v: boolean) => void;
  onWeeks: (v: number) => void;
};

/** LES-3: create-mode-only "repeat weekly for N weeks" option, calling the
 * existing generateRecurringLessons action instead of a single insert. */
export const LessonFormRecurring = ({
  repeatWeekly,
  weeks,
  disabled,
  onRepeatWeekly,
  onWeeks,
}: Props) => {
  const t = useTranslations('Lessons');
  return (
    <div style={s.field}>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        htmlFor="lesson-repeat-weekly"
      >
        <input
          id="lesson-repeat-weekly"
          type="checkbox"
          checked={repeatWeekly}
          disabled={disabled}
          onChange={(e) => onRepeatWeekly(e.target.checked)}
          data-testid="lesson-repeat-weekly-checkbox"
        />
        <span style={{ fontSize: 14 }}>{t('repeatWeekly')}</span>
      </label>

      {repeatWeekly && (
        <select
          style={{ ...s.input, marginTop: 8, width: 'auto' }}
          value={weeks}
          disabled={disabled}
          onChange={(e) => onWeeks(Number(e.target.value))}
          data-testid="lesson-repeat-weeks-select"
        >
          {WEEK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(WEEK_LABEL_KEYS[opt.value])}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
