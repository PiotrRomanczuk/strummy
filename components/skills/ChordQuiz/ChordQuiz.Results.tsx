'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { type ChordQuizAttemptInput } from '@/schemas/ChordQuizAttemptSchema';
import { ChordDiagram } from './ChordDiagram';
import { type QuizQuestion } from './chord-quiz.helpers';

interface ChordQuizResultsProps {
  questions: QuizQuestion[];
  attempts: ChordQuizAttemptInput[];
  score: number;
  submitState: 'idle' | 'submitting' | 'saved' | 'error';
  submitError: string | null;
  onRestart: () => void;
  /** When set (a drill), show a "back" link once the result is saved. */
  backHref?: string;
}

export function ChordQuizResults({
  questions,
  attempts,
  score,
  submitState,
  submitError,
  onRestart,
  backHref,
}: ChordQuizResultsProps) {
  const t = useTranslations('Skills');
  const total = questions.length;
  const missed = questions
    .map((q, i) => ({ q, attempt: attempts[i] }))
    .filter(({ attempt }) => attempt && !attempt.is_correct);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="text-5xl font-semibold">
          {score}
          <span className="text-muted-foreground"> / {total}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {score === total
            ? t('resultsPerfect')
            : score >= total * 0.8
              ? t('resultsStrong')
              : score >= total * 0.5
                ? t('resultsSolid')
                : t('resultsKeepAt')}
        </p>
      </div>

      <div role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {submitState === 'submitting' && t('resultsSaving')}
        {submitState === 'saved' && t('resultsSaved')}
        {submitState === 'error' && (
          <span className="text-rose-600">
            {submitError
              ? t('resultsSaveErrorWithDetail', { error: submitError })
              : t('resultsSaveErrorGeneric')}
          </span>
        )}
      </div>

      {missed.length > 0 && (
        <div className="w-full max-w-2xl">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('resultsChordsToReview')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {missed.map(({ q, attempt }) => (
              <li
                key={q.voicing.id}
                className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3"
              >
                <ChordDiagram voicing={q.voicing} size="sm" />
                <div className="text-xs text-muted-foreground">
                  {t('resultsYouPickedLabel')}{' '}
                  <span className="text-rose-600">{attempt?.selected_answer}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onRestart} size="lg" variant={backHref ? 'outline' : 'default'}>
          {t('resultsPlayAgainButton')}
        </Button>
        {backHref && (
          <Button asChild size="lg">
            <Link href={backHref}>{t('resultsBackToAssignmentButton')}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
