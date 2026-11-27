'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EXERCISE_KINDS, EXERCISE_NAME_MAX, EXERCISE_NOTE_MAX } from '@/schemas/SongExerciseSchema';

import type { useSaveExercise } from './useSaveExercise';

/** The fields of "Save as exercise": name, kind, note, and what went wrong or right. */
export const SaveExerciseForm = ({ form }: { form: ReturnType<typeof useSaveExercise> }) => {
  const t = useTranslations('SongCard');
  const message = { duplicate: 'exerciseDuplicate', failed: 'exerciseFailed' }[
    form.status as 'duplicate' | 'failed'
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="exercise-name">{t('exerciseName')}</Label>
        <Input
          id="exercise-name"
          value={form.name}
          maxLength={EXERCISE_NAME_MAX}
          onChange={(event) => form.setName(event.target.value)}
        />
      </div>
      <div className="grid gap-2" role="group" aria-label={t('exerciseKind')}>
        <Label>{t('exerciseKind')}</Label>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_KINDS.map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={form.kind === kind ? 'default' : 'outline'}
              aria-pressed={form.kind === kind}
              onClick={() => form.setKind(kind)}
            >
              {t(`exerciseKinds.${kind}`)}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exercise-note">{t('exerciseNote')}</Label>
        <Textarea
          id="exercise-note"
          value={form.note}
          maxLength={EXERCISE_NOTE_MAX}
          onChange={(event) => form.setNote(event.target.value)}
        />
      </div>
      {form.status === 'saved' && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {t('exerciseSaved')}
        </p>
      )}
      {message && (
        <p role="alert" className="text-destructive text-sm">
          {t(message)}
        </p>
      )}
    </div>
  );
};
