'use client';

import { useState, useTransition } from 'react';
import { Check, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { sendLessonSummaryEmail } from '@/app/dashboard/lessons/actions';
import { lessonGhostButton } from './lesson-detail.styles';

/** "Recap email" — sends the lesson summary email to the student now. */
export const LessonRecapButton = ({ lessonId }: { lessonId: string }) => {
  const t = useTranslations('Lessons');
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending || state === 'sent'}
      title={state === 'error' ? t('recapFailed') : undefined}
      onClick={() =>
        startTransition(async () => {
          const res = (await sendLessonSummaryEmail(lessonId)) as { success?: boolean } | undefined;
          setState(res && res.success === false ? 'error' : 'sent');
        })
      }
      style={{
        ...lessonGhostButton,
        color: state === 'error' ? 'var(--danger)' : lessonGhostButton.color,
      }}
    >
      {state === 'sent' ? <Check size={12} /> : <Mail size={12} strokeWidth={1.6} />}
      {state === 'sent' ? t('recapSent') : t('recapEmail')}
    </button>
  );
};
