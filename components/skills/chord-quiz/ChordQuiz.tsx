'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { submitChordQuizSession } from '@/app/actions/chord-quiz';
import { type ChordQuizAttemptInput, QUIZ_SESSION_LENGTH } from '@/schemas/ChordQuizAttemptSchema';
import { ALL_CHORD_NAMES, CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';
import { heartsLeft } from '@/lib/services/chord-quiz-progress.helpers';
import { ChordQuizQuestion } from './ChordQuiz.Question';
import { ChordQuizResults } from './ChordQuiz.Results';
import { ChordQuizTopBar } from './ChordQuiz.TopBar';
import { useChordQuiz } from './useChordQuiz';

type SubmitState = 'idle' | 'submitting' | 'saved' | 'error';
type QuizMode = 'random' | 'review';

interface ChordQuizProps {
  /** Chord IDs due for SRS review. When non-empty a Review Mode toggle is shown. */
  dueChordIds?: string[];
  /** Teacher-assigned drill (ASG-4): a fixed chord set. The score is stamped back
   *  onto the assignment on completion. Takes precedence over review/random. */
  drill?: { assignmentId: string; chordIds: string[] };
  /** Current day streak, and whether a session was already played today. */
  streak?: number;
  hasPlayedToday?: boolean;
}

export function ChordQuiz({
  dueChordIds = [],
  drill,
  streak = 0,
  hasPlayedToday = false,
}: ChordQuizProps) {
  const t = useTranslations('Skills');
  const [mode, setMode] = useState<QuizMode>(dueChordIds.length > 0 ? 'review' : 'random');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  // Frozen per session: saving revalidates the page, which would otherwise
  // re-render the summary with the already-updated streak.
  const [start, setStart] = useState({ streak, hasPlayedToday });

  const drillPool = useMemo(
    () => (drill ? CHORD_VOICINGS.filter((v) => drill.chordIds.includes(v.id)) : undefined),
    [drill]
  );
  const reviewPool = useMemo(
    () => CHORD_VOICINGS.filter((v) => dueChordIds.includes(v.id)),
    [dueChordIds]
  );

  const activePool = drill
    ? drillPool
    : mode === 'review' && reviewPool.length > 0
      ? reviewPool
      : undefined;
  const questionCount =
    activePool != null ? Math.min(activePool.length, QUIZ_SESSION_LENGTH) : QUIZ_SESSION_LENGTH;

  // A drill draws distractors from the whole library, so a short drill (< 4
  // chords) still has enough plausible wrong answers.
  const quiz = useChordQuiz({
    questionCount,
    pool: activePool,
    distractorNames: drill ? ALL_CHORD_NAMES : undefined,
  });

  const submitSession = useCallback(
    (attempts: ChordQuizAttemptInput[]) => {
      if (submittedRef.current || attempts.length === 0) return;
      submittedRef.current = true;
      setSubmitState('submitting');
      setSubmitError(null);

      submitChordQuizSession(attempts, drill?.assignmentId)
        .then((result) => {
          setSubmitState('error' in result ? 'error' : 'saved');
          if ('error' in result) setSubmitError(result.error);
        })
        .catch((err: unknown) => {
          setSubmitState('error');
          setSubmitError(err instanceof Error ? err.message : t('resultsUnknownError'));
        });
    },
    [drill?.assignmentId, t]
  );

  // Hearts run out only in free play: a teacher's drill is scored on every chord.
  const hearts = heartsLeft(quiz.attempts.filter((a) => !a.is_correct).length);
  const isOutOfHearts = !drill && hearts === 0;

  const handleNext = useCallback(() => {
    const isLast = quiz.currentIndex + 1 >= quiz.questions.length;
    if (isOutOfHearts) quiz.finish();
    else quiz.next();
    if (isLast || isOutOfHearts) submitSession(quiz.attempts);
  }, [quiz, submitSession, isOutOfHearts]);

  const handleRestart = useCallback(() => {
    setStart({ streak, hasPlayedToday });
    submittedRef.current = false;
    setSubmitState('idle');
    setSubmitError(null);
    quiz.restart();
  }, [quiz, streak, hasPlayedToday]);

  const handleModeChange = useCallback(
    (next: QuizMode) => {
      setMode(next);
      submittedRef.current = false;
      setSubmitState('idle');
      setSubmitError(null);
      quiz.restart();
    },
    [quiz]
  );

  const closeHref = drill ? `/dashboard/assignments/${drill.assignmentId}` : '/dashboard/skills';
  const progress = quiz.questions.length
    ? ((quiz.currentIndex + (quiz.phase === 'answering' ? 0 : 1)) / quiz.questions.length) * 100
    : 0;

  return (
    <section className="ui-quiz-page">
      <ChordQuizTopBar
        closeHref={closeHref}
        closeLabel={t('quizClose')}
        progress={quiz.phase === 'finished' ? 100 : progress}
        hearts={hearts}
        heartsLabel={t('quizHeartsLeft', { count: hearts })}
        streak={start.streak}
        streakLabel={t('streakLabel', { count: start.streak })}
      />

      <div className="ui-quiz-body">
        {drill && <p className="ui-quiz-note">{t('quizSubtitleDrill')}</p>}
        {drill && drillPool?.length === 0 && <p className="ui-quiz-note">{t('quizEmptyDrill')}</p>}

        {!drill && dueChordIds.length > 0 && quiz.phase !== 'finished' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {(['random', 'review'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                aria-pressed={mode === m}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${mode === m ? 'var(--ink)' : 'var(--rule)'}`,
                  background: mode === m ? 'var(--ink)' : 'var(--card)',
                  color: mode === m ? 'var(--paper)' : 'var(--ink-3)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {m === 'random'
                  ? t('quizModeRandom')
                  : t('quizModeReviewCount', { count: dueChordIds.length })}
              </button>
            ))}
          </div>
        )}

        {quiz.phase !== 'finished' && quiz.current && (
          <ChordQuizQuestion
            question={quiz.current}
            questionNumber={quiz.currentIndex + 1}
            totalQuestions={quiz.questions.length}
            selected={quiz.selected}
            revealed={quiz.phase === 'reveal'}
            onSelect={quiz.selectAnswer}
            onNext={handleNext}
          />
        )}

        {quiz.phase === 'finished' && (
          <ChordQuizResults
            questions={quiz.questions}
            attempts={quiz.attempts}
            score={quiz.score}
            submitState={submitState}
            submitError={submitError}
            onRestart={handleRestart}
            continueHref={closeHref}
            backHref={drill ? closeHref : undefined}
            streakBefore={start.streak}
            isFirstToday={!start.hasPlayedToday}
            isOutOfHearts={isOutOfHearts && quiz.attempts.length < quiz.questions.length}
          />
        )}
      </div>
    </section>
  );
}
