import Link from 'next/link';
import { Flame, Heart, X } from 'lucide-react';

type Props = {
  closeHref: string;
  closeLabel: string;
  progress: number;
  hearts: number;
  heartsLabel: string;
  streak: number;
  streakLabel: string;
};

const counter = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--ink)',
  fontVariantNumeric: 'tabular-nums',
} as const;

/** Quiz top bar (Claude Design): close · session progress · hearts · day streak. */
export const ChordQuizTopBar = ({
  closeHref,
  closeLabel,
  progress,
  hearts,
  heartsLabel,
  streak,
  streakLabel,
}: Props) => (
  <header className="ui-quiz-top">
    <Link
      href={closeHref}
      aria-label={closeLabel}
      style={{
        width: 36,
        height: 36,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        color: 'var(--ink-3)',
        marginLeft: -8,
      }}
    >
      <X size={20} />
    </Link>
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      style={{
        flex: 1,
        height: 10,
        borderRadius: 999,
        background: 'var(--rule-2)',
        overflow: 'hidden',
        margin: '0 8px',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--gold)',
          borderRadius: 999,
          transition: 'width .3s ease',
        }}
      />
    </div>
    <span style={counter} aria-label={heartsLabel} title={heartsLabel} data-testid="quiz-hearts">
      <Heart size={20} fill="var(--danger)" color="var(--danger)" strokeWidth={0} /> {hearts}
    </span>
    <span style={{ ...counter, marginLeft: 8 }} aria-label={streakLabel} title={streakLabel}>
      <Flame size={20} fill="var(--gold)" color="var(--gold)" strokeWidth={0} /> {streak}
    </span>
  </header>
);
