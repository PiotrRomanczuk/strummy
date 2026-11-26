'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { deleteSongExercise } from '@/app/actions/song-exercises';

const button =
  'rounded-md border border-[var(--rule)] bg-[var(--card)] px-2.5 py-1.5 text-[12.5px] text-[var(--ink-3)] hover:bg-[var(--rule-2)] disabled:opacity-40';

/** Removes an exercise after a second click ("Delete" → "Sure?"). */
export const ExerciseDeleteButton = ({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) => {
  const t = useTranslations('Exercises');
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy' | 'failed'>('idle');

  const remove = async () => {
    setStep('busy');
    const result = await deleteSongExercise(exerciseId).catch(() => ({ error: 'failed' as const }));
    if ('error' in result) return setStep('failed');
    router.refresh();
  };

  if (step === 'idle')
    return (
      <button
        type="button"
        className={button}
        onClick={() => setStep('confirm')}
        aria-label={t('deleteNamed', { name })}
      >
        {t('delete')}
      </button>
    );
  return (
    <span className="flex items-center gap-2">
      {step === 'failed' && (
        <span role="alert" className="text-[12px] text-[var(--danger)]">
          {t('deleteFailed')}
        </span>
      )}
      <button type="button" className={button} disabled={step === 'busy'} onClick={remove}>
        {t('confirmDelete')}
      </button>
      <button
        type="button"
        className={button}
        disabled={step === 'busy'}
        onClick={() => setStep('idle')}
      >
        {t('cancel')}
      </button>
    </span>
  );
};
