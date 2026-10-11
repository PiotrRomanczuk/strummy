'use client';

import { useTranslations } from 'next-intl';

import { formStyles } from '@/components/shared/form.styles';
import { FormPageHeader, FormTitleAccent } from '@/components/shared/FormPageHeader';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import { CreateStudentFormFields } from './CreateStudentForm.Fields';
import { CreateStudentFormPreview } from './CreateStudentForm.Preview';
import { useCreateStudentForm } from './useCreateStudentForm';

const FORM_ID = 'create-student-form';

/** Claude Design "Add a *student*." form. */
export const CreateStudentForm = () => {
  const t = useTranslations('Users');
  const { values, errors, error, isPending, setField, handleSubmit, previewName } =
    useCreateStudentForm();

  return (
    <div style={formStyles.page}>
      <FormPageHeader
        crumbLabel={t('createFormCrumb')}
        crumbHref="/dashboard/users"
        current={t('createFormCrumbCurrent')}
        title={
          <>
            {t('createFormTitleLead')} <FormTitleAccent>{t('createFormTitleNoun')}</FormTitleAccent>
            .
          </>
        }
        sub={t('createFormDescription')}
        cancelHref="/dashboard/users"
        cancelLabel={t('cancelButton')}
        submitLabel={isPending ? t('createFormSubmitPending') : t('createFormSubmitButton')}
        formId={FORM_ID}
        isSaving={isPending}
      />

      <form id={FORM_ID} onSubmit={handleSubmit} className="ui-grid-form">
        <div>
          <CreateStudentFormFields values={values} onChange={setField} errors={errors} />
          {error && <div style={formStyles.error}>{error}</div>}
        </div>

        <FormPreviewPanel>
          <CreateStudentFormPreview
            name={previewName}
            skillLevel={values.skillLevel}
            avatarColor={values.avatarColor}
            lessonDay={values.lessonDay}
            lessonTime={values.lessonTime}
            lessonRate={values.lessonRate}
            billingCycle={values.billingCycle}
          />
        </FormPreviewPanel>
      </form>
    </div>
  );
};
