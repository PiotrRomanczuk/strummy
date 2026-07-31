'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';

import { inputStyle, StudentField, type StudentSectionProps } from './StudentFields.shared';

type Props = StudentSectionProps & {
  /** Edit context manages the invite email via the dedicated invite flow. */
  showStudentEmail?: boolean;
};

/** Section II — Contact: student email/phone, parent/guardian name + email. */
export const StudentFieldsContact = ({
  values,
  onChange,
  errors,
  showStudentEmail = true,
}: Props) => {
  const t = useTranslations('Users');
  const populated = [
    showStudentEmail ? values.studentEmail : '',
    values.phone,
    values.parentName,
    values.parentEmail,
  ].filter((v) => v && v.trim()).length;
  const count = showStudentEmail ? 4 : 3;

  return (
    <FormSection
      numeral={t('fieldsContactNumeral')}
      title={t('fieldsContactTitle')}
      count={count}
      populated={populated}
    >
      <div className="ui-form-row-2" style={{ marginBottom: 16 }}>
        {showStudentEmail && (
          <StudentField
            label={t('fieldsContactStudentEmailLabel')}
            hint={t('fieldsContactStudentEmailHint')}
            error={errors?.studentEmail}
          >
            <input
              type="email"
              value={values.studentEmail}
              onChange={(e) => onChange('studentEmail', e.target.value)}
              placeholder="student@email.com"
              style={inputStyle}
            />
          </StudentField>
        )}
        <StudentField label={t('fieldsContactStudentPhoneLabel')}>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="(555) 000-0000"
            maxLength={50}
            style={inputStyle}
          />
        </StudentField>
      </div>

      <div className="ui-form-row-2">
        <StudentField
          label={t('fieldsContactParentNameLabel')}
          hint={t('fieldsContactParentNameHint')}
        >
          <input
            value={values.parentName}
            onChange={(e) => onChange('parentName', e.target.value)}
            placeholder={t('fieldsContactParentNamePlaceholder')}
            maxLength={200}
            style={inputStyle}
          />
        </StudentField>
        <StudentField label={t('fieldsContactParentEmailLabel')} error={errors?.parentEmail}>
          <input
            type="email"
            value={values.parentEmail}
            onChange={(e) => onChange('parentEmail', e.target.value)}
            placeholder="parent@email.com"
            style={inputStyle}
          />
        </StudentField>
      </div>
    </FormSection>
  );
};
