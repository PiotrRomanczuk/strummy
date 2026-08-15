'use client';

import { useTranslations } from 'next-intl';

import FormActions from '@/components/shared/FormActions';

interface Props {
  isSubmitting: boolean;
  onCancel: () => void;
  isEditing?: boolean;
}

export function LessonFormActions({ isSubmitting, onCancel, isEditing = false }: Props) {
  const t = useTranslations('Lessons');
  return (
    <div className="pt-2 sm:pt-4" data-testid="lesson-submit-wrapper">
      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        showCancel
        submitText={isEditing ? t('saveChanges') : t('createLesson')}
        submittingText={isEditing ? t('saving') : t('creating')}
      />
    </div>
  );
}
