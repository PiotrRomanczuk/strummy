'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Flame, RotateCcw, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { xpFor } from '@/lib/services/chord-quiz-progress.helpers';
import { type ChordQuizAttemptInput } from '@/schemas/ChordQuizAttemptSchema';
import { type QuizQuestion } from './chord-quiz.helpers';
import {
  ChordStrip,
  PillStat,
  resultsCard,
  resultsEyebrow,
  SessionDots,
} from './ChordQuiz.ResultsParts';

interface ChordQuizResultsProps {
  questions: QuizQuestion[];
  attempts: ChordQuizAttemptInput[];
  score: number;
  submitState: 'idle' | 'submitting' | 'saved' | 'error';
  submitError: string | null;
  onRestart: () => void;
  /** Where "Continue" goes: the skills hub, or the drill's assignment. */
  continueHref: string;
  /** When set (a drill), the primary action reads "Back to assignment". */
  backHref?: string;
  /** Day streak before this session, and whether this session started today's. */
  streakBefore: number;
  isFirstToday: boolean;
  /** The session ended early because every heart was lost. */
  isOutOfHearts?: boolean;
}

/** Claude Design end-of-session summary: accuracy hero, stats, right/missed chords, per-question dots. */
export function ChordQuizResults({
  questions,
  attempts,
  score,
  submitState,
  submitError,
  onRestart,
  continueHref,
  backHref,
  streakBefore,
  isFirstToday,
  isOutOfHearts = false,
}: ChordQuizResultsProps) {
  const t = useTranslations('Skills');
  const answered = questions.slice(0, attempts.length);
  const total = answered.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const right = answered.filter((_, i) => attempts[i]?.is_correct);
  const missed = answered.filter((_, i) => !attempts[i]?.is_correct);
  const streakAfter = isFirstToday ? streakBefore + 1 : streakBefore;
  const times = attempts
    .map((a) => a.response_time_ms)
    .filter((ms): ms is number => typeof ms === 'number');
  const avg = times.length
    ? `${(times.reduce((s, ms) => s + ms, 0) / times.length / 1000).toFixed(1)}s`
    : '—';
  const verdict = isOutOfHearts
    ? t('resultsOutOfHearts')
    : score === total
      ? t('resultsPerfect')
      : score >= total * 0.8
        ? t('resultsStrong')
        : score >= total * 0.5
          ? t('resultsSolid')
          : t('resultsKeepAt');

  return (
    <div
      style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <p style={{ ...resultsEyebrow, marginBottom: 8 }}>{t('summaryEyebrow')}</p>
        <p className="ui-quiz-score">
          {pct}
          <span style={{ fontSize: '0.36em', fontWeight: 400, color: 'var(--ink-4)' }}>%</span>
        </p>
        <p
          style={{
            margin: '6px 0 0',
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--ink-3)',
          }}
        >
          {t('summaryCorrectOf', { correct: score, total })}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{verdict}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <PillStat
          icon={<Zap size={16} />}
          value={`+${xpFor(score)}`}
          label={t('summaryXp')}
          color="var(--gold-2)"
        />
        <PillStat
          icon={<Flame size={16} />}
          value={String(streakAfter)}
          label={t('summaryStreak')}
          color="var(--gold-2)"
          sub={
            isFirstToday ? t('summaryStreakFrom', { count: streakBefore }) : t('summaryStreakKept')
          }
        />
        <PillStat
          icon={<Clock size={16} />}
          value={avg}
          label={t('summaryAvg')}
          color="var(--ink)"
        />
      </div>

      {right.length > 0 && (
        <ChordStrip isUp title={t('summaryGotRight')} sub={t('summaryGotRightSub')} items={right} />
      )}
      {missed.length > 0 && (
        <ChordStrip
          isUp={false}
          title={t('summaryNeedWork')}
          sub={t('summaryNeedWorkSub')}
          items={missed}
        />
      )}

      <SessionDots title={t('summaryThisSession')} questions={answered} attempts={attempts} />

      <div
        role="status"
        aria-live="polite"
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: submitState === 'error' ? 'var(--danger)' : 'var(--ink-4)',
        }}
      >
        {submitState === 'submitting' && t('resultsSaving')}
        {submitState === 'saved' && t('resultsSaved')}
        {submitState === 'error' &&
          (submitError
            ? t('resultsSaveErrorWithDetail', { error: submitError })
            : t('resultsSaveErrorGeneric'))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            height: 48,
            borderRadius: 10,
            border: '1px solid var(--rule)',
            background: 'var(--card)',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} /> {t('resultsPlayAgainButton')}
        </button>
        <Link
          href={continueHref}
          style={{
            height: 48,
            borderRadius: 10,
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          {backHref ? t('resultsBackToAssignmentButton') : t('summaryContinue')}{' '}
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
