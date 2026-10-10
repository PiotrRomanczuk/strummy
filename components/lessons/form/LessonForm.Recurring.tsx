'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
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

/** LES-3 "Repeats": the Claude Design toggle row, with the week count once on. */
export const LessonFormRecurring = ({
  repeatWeekly,
  weeks,
  disabled,
  onRepeatWeekly,
  onWeeks,
}: Props) => {
  const t = useTranslations('Lessons');
  return (
    <div style={{ ...s.field, marginBottom: 0 }}>
      <span style={s.label}>{t('repeatsLabel')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={repeatWeekly}
        disabled={disabled}
        onClick={() => onRepeatWeekly(!repeatWeekly)}
        data-testid="lesson-repeat-weekly-checkbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          cursor: 'pointer',
          background: 'var(--card)',
          width: '100%',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 18,
            borderRadius: 99,
            background: repeatWeekly ? 'var(--gold-2)' : 'var(--rule-2)',
            position: 'relative',
            flex: '0 0 auto',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'var(--on-accent)',
              position: 'absolute',
              top: 2,
              left: repeatWeekly ? 18 : 2,
              transition: 'left .15s',
            }}
          />
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {repeatWeekly ? t('repeatsWeekly') : t('repeatsOnce')}
        </span>
      </button>
      {repeatWeekly && (
        <select
          aria-label={t('repeatsLabel')}
          style={{ ...s.input, marginTop: 8 }}
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
