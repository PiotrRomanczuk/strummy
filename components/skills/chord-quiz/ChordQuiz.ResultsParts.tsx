import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { type ChordQuizAttemptInput } from '@/schemas/ChordQuizAttemptSchema';
import { ChordDiagram } from './ChordDiagram';
import { type QuizQuestion } from './chord-quiz.helpers';

export const resultsEyebrow = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: 'var(--ink-4)',
  margin: 0,
} as const;
export const resultsCard = {
  border: '1px solid var(--rule)',
  borderRadius: 12,
  background: 'var(--card)',
  padding: 16,
} as const;

export const PillStat = ({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  color: string;
  sub?: string;
}) => (
  <div style={{ ...resultsCard, textAlign: 'center' }}>
    <div style={{ color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
    <div
      style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 600, lineHeight: 1, color }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
        color: 'var(--ink-4)',
        marginTop: 6,
      }}
    >
      {label}
    </div>
    {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>}
  </div>
);

export const ChordStrip = ({
  isUp,
  title,
  sub,
  items,
}: {
  isUp: boolean;
  title: string;
  sub: string;
  items: QuizQuestion[];
}) => {
  const tone = isUp ? 'var(--success)' : 'var(--danger)';
  return (
    <div style={resultsCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            color: tone,
            background: `color-mix(in oklab, ${tone} 14%, transparent)`,
          }}
        >
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 'auto' }}>{sub}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {items.map((q) => (
          <div
            key={q.voicing.id}
            style={{
              flex: '0 0 auto',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              background: 'var(--rule-2)',
              padding: 6,
              textAlign: 'center',
            }}
          >
            <ChordDiagram voicing={q.voicing} size="xs" hideName />
            <div
              style={{ fontFamily: 'var(--serif)', fontSize: 12, fontWeight: 600, marginTop: 4 }}
            >
              {q.voicing.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** One square per answered question, green when right, red when missed. */
export const SessionDots = ({
  title,
  questions,
  attempts,
}: {
  title: string;
  questions: QuizQuestion[];
  attempts: ChordQuizAttemptInput[];
}) => (
  <div style={resultsCard}>
    <p style={{ ...resultsEyebrow, marginBottom: 12 }}>{title}</p>
    <div style={{ display: 'flex', gap: 6 }}>
      {questions.map((q, i) => {
        const isOk = attempts[i]?.is_correct;
        const tone = isOk ? 'var(--success)' : 'var(--danger)';
        return (
          <div
            key={`${q.voicing.id}-${i}`}
            title={q.voicing.name}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: tone,
              background: `color-mix(in oklab, ${tone} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${tone} 25%, transparent)`,
            }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  </div>
);
