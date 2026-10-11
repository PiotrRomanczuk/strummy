import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Flame } from 'lucide-react';

export const quizEyebrow = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: 'var(--ink-4)',
} as const;

export const quizCard = {
  border: '1px solid var(--rule)',
  borderRadius: 12,
  background: 'var(--card)',
} as const;

type StatProps = {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  /** 0–1; draws a thin progress bar under the value. */
  progress?: number;
  isAccent?: boolean;
  className?: string;
};

/** Quiz home stat tile: icon chip + label, big serif value, small sub line. */
export const QuizStatTile = ({
  icon,
  label,
  value,
  sub,
  progress,
  isAccent = false,
  className,
}: StatProps) => (
  <div
    className={className}
    style={{
      ...quizCard,
      padding: 16,
      background: isAccent
        ? 'linear-gradient(135deg, var(--gold-tint), var(--card) 70%)'
        : 'var(--card)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: isAccent
            ? 'color-mix(in oklab, var(--gold) 18%, transparent)'
            : 'var(--rule-2)',
          color: isAccent ? 'var(--gold-2)' : 'var(--ink-3)',
        }}
      >
        {icon}
      </span>
      <span style={quizEyebrow}>{label}</span>
    </div>
    <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 600, lineHeight: 1 }}>
      {value}
    </div>
    {progress != null && (
      <div
        style={{
          height: 4,
          marginTop: 8,
          borderRadius: 999,
          background: 'var(--rule-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(1, progress) * 100}%`,
            height: '100%',
            background: 'var(--gold)',
          }}
        />
      </div>
    )}
    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>{sub}</div>
  </div>
);

/** Amber streak badge (fire + day count) shown in quiz headers. */
export const QuizStreakBadge = ({ streak, label }: { streak: number; label: string }) => (
  <span
    title={label}
    aria-label={label}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 14,
      fontWeight: 600,
      background: 'var(--gold-tint)',
      border: '1px solid var(--gold-dim)',
      color: 'var(--gold-2)',
    }}
  >
    <Flame size={14} fill="currentColor" strokeWidth={0} />
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
  </span>
);

type ModeProps = {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
  time: string;
  start: string;
  isPrimary?: boolean;
};

/** Quiz mode card; the primary one carries a gold wash. */
export const QuizModeCard = ({
  href,
  icon,
  title,
  desc,
  time,
  start,
  isPrimary = false,
}: ModeProps) => (
  <Link
    href={href}
    className="ui-quick-action"
    style={{
      ...quizCard,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: 20,
      color: 'inherit',
      textDecoration: 'none',
      borderColor: isPrimary ? 'var(--gold-dim)' : 'var(--rule)',
      background: isPrimary
        ? 'linear-gradient(135deg, var(--gold-tint), var(--card) 60%)'
        : 'var(--card)',
    }}
  >
    <span
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        background: isPrimary
          ? 'color-mix(in oklab, var(--gold) 18%, transparent)'
          : 'var(--rule-2)',
        color: isPrimary ? 'var(--gold-2)' : 'var(--ink)',
      }}
    >
      {icon}
    </span>
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--ink-4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Clock size={12} /> {time}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: isPrimary ? 'var(--gold-2)' : 'var(--ink-3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {start} <ArrowRight size={14} />
      </span>
    </div>
  </Link>
);
