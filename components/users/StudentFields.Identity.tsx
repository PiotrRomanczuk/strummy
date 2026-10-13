'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';
import { AVATAR_COLORS, INSTRUMENTS, SKILL_LEVELS } from '@/schemas/StudentIntakeSchema';

import {
  inputStyle,
  requiredInputStyle,
  segmentBtnStyle,
  StudentField,
  type StudentSectionProps,
} from './student-fields.shared';

type SkillLevelSelectorProps = Pick<StudentSectionProps, 'values' | 'onChange'> & {
  t: ReturnType<typeof useTranslations>;
};

/** `Users.*` label per stored value; the stored values stay English. */
const LEVEL_KEYS: Record<string, string> = {
  beginner: 'skillLevelBeginner',
  novice: 'skillLevelNovice',
  intermediate: 'skillLevelIntermediate',
  advanced: 'skillLevelAdvanced',
};
const INSTRUMENT_KEYS: Record<string, string> = {
  Guitar: 'instrumentGuitar',
  Bass: 'instrumentBass',
  Ukulele: 'instrumentUkulele',
  Piano: 'instrumentPiano',
};

/**
 * "Level" control — every level the DB allows (SKILL_LEVELS), as a 2×2 grid:
 * four in one row clipped "Advanced" to "Advanc" in the desktop third-width
 * column and "Intermediate" to "Intermed…" on a phone.
 */
const SkillLevelSelector = ({ values, onChange, t }: SkillLevelSelectorProps) => (
  <div className="grid grid-cols-2 gap-1.5">
    {SKILL_LEVELS.map((lvl) => (
      <button
        type="button"
        key={lvl}
        onClick={() => onChange('skillLevel', lvl)}
        aria-pressed={values.skillLevel === lvl}
        // Translated labels carry their own casing; `capitalize` would turn
        // "Średnio zaawansowany" into "Średnio Zaawansowany".
        style={{ ...segmentBtnStyle(values.skillLevel === lvl), textTransform: 'none' }}
      >
        {t(LEVEL_KEYS[lvl])}
      </button>
    ))}
  </div>
);

type AvatarColorSelectorProps = Pick<StudentSectionProps, 'values' | 'onChange'> & {
  t: ReturnType<typeof useTranslations>;
};

/** Avatar colour swatches. */
const AvatarColorSelector = ({ values, onChange, t }: AvatarColorSelectorProps) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    {AVATAR_COLORS.map((c) => (
      <button
        type="button"
        key={c}
        aria-label={t('fieldsIdentityAvatarColorAriaLabel', { color: c })}
        aria-pressed={values.avatarColor === c}
        onClick={() => onChange('avatarColor', c)}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: c,
          cursor: 'pointer',
          border: values.avatarColor === c ? '2px solid var(--ink)' : '2px solid transparent',
        }}
      />
    ))}
  </div>
);

/** Section I — Identity: full name, instrument, level, start date, avatar colour. */
export const StudentFieldsIdentity = ({ values, onChange, errors }: StudentSectionProps) => {
  const t = useTranslations('Users');
  const populated = [
    values.fullName,
    values.instrument,
    values.startDate,
    values.avatarColor,
  ].filter((v) => v && v.trim()).length;

  return (
    <FormSection
      numeral={t('editFormIdentityNumeral')}
      title={t('fieldsIdentityTitle')}
      count={4}
      populated={populated}
    >
      <div className="ui-form-row-2" style={{ marginBottom: 16 }}>
        <StudentField label={t('editFormFullNameLabel')} required error={errors?.fullName}>
          <input
            required
            value={values.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            placeholder={t('fieldsIdentityFullNamePlaceholder')}
            maxLength={200}
            style={requiredInputStyle}
          />
        </StudentField>
        <StudentField
          label={t('fieldsIdentityInstrumentLabel')}
          hint={t('fieldsIdentityInstrumentHint')}
        >
          <select
            value={values.instrument}
            onChange={(e) => onChange('instrument', e.target.value)}
            style={inputStyle}
          >
            {INSTRUMENTS.map((v) => (
              <option key={v} value={v}>
                {INSTRUMENT_KEYS[v] ? t(INSTRUMENT_KEYS[v]) : v}
              </option>
            ))}
          </select>
        </StudentField>
      </div>

      <div className="ui-form-row-3">
        <StudentField label={t('fieldsIdentityLevelLabel')} required error={errors?.skillLevel}>
          <SkillLevelSelector values={values} onChange={onChange} t={t} />
        </StudentField>
        <StudentField label={t('fieldsIdentityStartDateLabel')}>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
            style={inputStyle}
          />
        </StudentField>
        <StudentField label={t('fieldsIdentityAvatarColorLabel')}>
          <AvatarColorSelector values={values} onChange={onChange} t={t} />
        </StudentField>
      </div>
    </FormSection>
  );
};
