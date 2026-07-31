'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form-styles';
import { SubmissionTypeEnum, type SubmissionType } from '@/schemas/AssignmentSchema';

type Props = {
  value: SubmissionType;
  onChange: (value: SubmissionType) => void;
  disabled?: boolean;
};

/** Segmented toggle declaring the expected proof (self-report / audio / video / note). */
export const AssignmentSubmissionTypeToggle = ({ value, onChange, disabled }: Props) => {
  const t = useTranslations('Assignments');
  const labels: Record<SubmissionType, string> = {
    self_report: t('submissionTypeSelfReport'),
    audio: t('submissionTypeAudioRecording'),
    video: t('submissionTypeVideo'),
    note: t('submissionTypeNote'),
  };

  return (
    <div style={{ ...s.field, marginBottom: 0 }}>
      <label style={s.label}>{t('submissionTypeQuestion')}</label>
      <div
        role="radiogroup"
        aria-label={t('submissionTypeAriaLabel')}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {SubmissionTypeEnum.options.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(option)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                cursor: disabled ? 'default' : 'pointer',
                background: isSelected ? 'var(--ink)' : 'var(--card)',
                color: isSelected ? 'var(--paper)' : 'var(--ink-3)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--ink)' : 'var(--rule)',
                fontFamily: 'var(--sans, inherit)',
              }}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
