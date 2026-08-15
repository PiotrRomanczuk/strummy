'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MobilePageShell } from '@/components/shared/MobilePageShell';
import { StepWizardForm } from '@/components/shared';
import { StepBasicInfo, StepDetails } from './CourseForm.Steps';
import {
  createTheoryCourse,
  updateTheoryCourse,
} from '@/app/dashboard/theory/actions';

interface CourseFormProps {
  mode: 'create' | 'edit';
  courseId?: string;
  defaultValues?: {
    title: string;
    description: string;
    cover_image_url: string;
    level: string;
    is_published: boolean;
  };
}

/**
 * v2 Theory Course Form using StepWizardForm primitive.
 * Step 1: Title and description.
 * Step 2: Level, cover image, publish toggle.
 *
 * Reuses existing `createTheoryCourse` and `updateTheoryCourse` server actions.
 */
export function CourseForm({ mode, courseId, defaultValues }: CourseFormProps) {
  const router = useRouter();
  const t = useTranslations('Theory');
  const [formData, setFormData] = useState({
    title: defaultValues?.title ?? '',
    description: defaultValues?.description ?? '',
    cover_image_url: defaultValues?.cover_image_url ?? '',
    level: defaultValues?.level ?? 'beginner',
    is_published: defaultValues?.is_published ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setErrors({ title: t('courseFormTitleRequiredError') });
      toast.error(t('courseFormTitleRequiredToast'));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const input = {
      title: formData.title,
      description: formData.description || undefined,
      cover_image_url: formData.cover_image_url || undefined,
      level: formData.level,
      is_published: formData.is_published,
    };

    const result =
      mode === 'create'
        ? await createTheoryCourse(input)
        : await updateTheoryCourse(courseId!, input);

    setIsSubmitting(false);

    if (!result.success) {
      const errorMsg = 'error' in result ? result.error : t('courseFormError');
      toast.error(errorMsg ?? t('courseFormError'));
      return;
    }

    toast.success(
      mode === 'create' ? t('courseFormCreatedToast') : t('courseFormUpdatedToast')
    );

    if (mode === 'create' && 'courseId' in result) {
      router.push(`/dashboard/theory/${result.courseId}`);
    } else {
      router.push(`/dashboard/theory/${courseId}`);
    }
  };

  const steps = [
    {
      label: t('courseFormStepBasicInfo'),
      content: (
        <StepBasicInfo formData={formData} onChange={setFormData} errors={errors} />
      ),
      requiredFields: ['title'],
    },
    {
      label: t('courseFormStepDetails'),
      content: (
        <StepDetails formData={formData} onChange={setFormData} errors={errors} />
      ),
    },
  ];

  const title = mode === 'create' ? t('courseFormNewTitle') : t('courseFormEditTitle');

  return (
    <MobilePageShell title={title} showBack>
      <form onSubmit={handleSubmit}>
        <StepWizardForm
          steps={steps}
          formData={formData as unknown as Record<string, unknown>}
          errors={errors}
          submitLabel={
            isSubmitting
              ? t('courseFormSavingButton')
              : mode === 'create'
                ? t('courseFormCreateButton')
                : t('courseFormSaveButton')
          }
          submitDisabled={isSubmitting}
        />
      </form>
    </MobilePageShell>
  );
}
