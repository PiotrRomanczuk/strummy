'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import FormAlert from '@/components/shared/FormAlert';
import { submitTeacherLead } from '@/app/actions/teacher-leads';
import { TeacherLeadFields, type LeadFieldValues } from './TeacherLeadForm.Fields';

const EMPTY: LeadFieldValues = {
  fullName: '',
  email: '',
  phone: '',
  teachingContext: undefined,
  studentCount: undefined,
  biggestPain: '',
  wantsContact: true,
  website: '',
};

export const TeacherLeadForm = () => {
  const t = useTranslations('ForTeachers');
  const searchParams = useSearchParams();
  const [values, setValues] = useState<LeadFieldValues>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setField = <K extends keyof LeadFieldValues>(key: K, value: LeadFieldValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    // Clearing on edit rather than on submit: an error the visitor is already
    // fixing has stopped being information and started being noise.
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // Campaign attribution comes from the URL the link carried, never from a
    // field — a visitor should not have to tell us where they clicked from.
    const source = searchParams.get('source') ?? searchParams.get('utm_source') ?? '';

    const result = await submitTeacherLead({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      teachingContext: values.teachingContext,
      studentCount: values.studentCount,
      biggestPain: values.biggestPain,
      wantsContact: values.wantsContact,
      source,
      website: values.website === '' ? '' : undefined,
    });

    setSubmitting(false);
    if (result.success) {
      setDone(true);
      return;
    }
    setError(result.error ?? 'errors.generic');
  };

  if (done) {
    return (
      <div data-testid="lead-success" className="space-y-4 text-center">
        <CheckCircle2 className="text-primary mx-auto h-10 w-10" aria-hidden />
        <h2 className="text-2xl font-semibold">{t('success.heading')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('success.body')}</p>
        <Link
          href="/sign-in?demo=true"
          className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t('success.backToDemo')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{t('form.heading')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('form.lede')}</p>
      </div>

      {error && <FormAlert type="error" message={t(error)} />}

      <TeacherLeadFields values={values} disabled={submitting} onChange={setField} />

      <Button
        type="submit"
        data-testid="lead-submit"
        disabled={submitting}
        className="h-12 w-full text-base font-bold"
      >
        {submitting ? t('form.submitting') : t('form.submit')}
      </Button>

      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        {t('form.privacy')}
      </p>
    </form>
  );
};
