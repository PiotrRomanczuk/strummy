'use client';

import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ChordDiagram } from './ChordDiagram';
import { type QuizQuestion } from './chord-quiz.helpers';

interface ChordQuizQuestionProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selected: string | null;
  /** True after the user has picked an answer; reveals correct/incorrect colors. */
  revealed: boolean;
  onSelect: (option: string) => void;
  onNext: () => void;
}

const eyebrow = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: 'var(--ink-4)',
} as const;

const choiceTone = (revealed: boolean, isCorrect: boolean, isSelected: boolean) =>
  !revealed ? null : isCorrect ? 'var(--success)' : isSelected ? 'var(--danger)' : null;

/**
 * Claude Design in-quiz screen: the question and chord card on the left, four
 * keyed answers on the right (stacked on phones). Keys 1–4 pick, Enter moves on.
 */
export function ChordQuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selected,
  revealed,
  onSelect,
  onNext,
}: ChordQuizQuestionProps) {
  const t = useTranslations('Skills');
  const correct = question.voicing.name;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = Number(e.key) - 1;
      if (!revealed && idx >= 0 && idx < question.options.length) onSelect(question.options[idx]);
      if (revealed && e.key === 'Enter') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, question.options, onSelect, onNext]);

  return (
    <div className="ui-quiz-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p style={{ ...eyebrow, margin: 0 }}>
            {t('quizEyebrow', { current: questionNumber, total: totalQuestions })}
          </p>
          <h1 className="ui-quiz-heading">{t('quizHeading')}</h1>
        </div>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 16,
            border: '1px solid var(--rule)',
            background: 'var(--card)',
            padding: 28,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -48,
              right: -48,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'var(--gold-tint)',
              filter: 'blur(24px)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <ChordDiagram voicing={question.voicing} size="lg" hideName />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="hidden md:block" style={{ ...eyebrow, margin: 0 }}>
          {t('quizChooseOne')}
        </p>
        <div className="ui-quiz-choices">
          {question.options.map((option, i) => {
            const isSelected = selected === option;
            const tone = choiceTone(revealed, option === correct, isSelected);
            return (
              <button
                key={option}
                type="button"
                className="ui-quiz-choice"
                disabled={revealed}
                onClick={() => onSelect(option)}
                aria-pressed={isSelected}
                style={{
                  borderColor: tone ?? 'var(--rule)',
                  background: tone
                    ? `color-mix(in oklab, ${tone} 10%, var(--card))`
                    : 'var(--card)',
                  boxShadow: tone ? `0 0 0 1px ${tone}` : 'none',
                }}
              >
                <span className="ui-quiz-key" aria-hidden="true">
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: tone ?? 'var(--ink)',
                  }}
                >
                  {option}
                </span>
                <ChevronRight
                  className="hidden md:block"
                  size={16}
                  style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}
                />
              </button>
            );
          })}
        </div>

        {revealed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 500,
                color: selected === correct ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {selected === correct
                ? t('questionCorrectFeedback')
                : t('questionIncorrectFeedback', { answer: correct })}
            </p>
            <button
              type="button"
              onClick={onNext}
              style={{
                padding: '13px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {questionNumber === totalQuestions
                ? t('questionSeeResultsButton')
                : t('questionNextButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
