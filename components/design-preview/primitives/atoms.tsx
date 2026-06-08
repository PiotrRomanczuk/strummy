import type { CSSProperties, ReactNode } from 'react';

import type { Health } from '../lib/types';

export const healthColor = (h: Health | string): string =>
  ({
    excellent: 'var(--success)',
    good: 'var(--success)',
    needs_attention: 'var(--warn)',
    at_risk: 'var(--danger)',
    critical: 'var(--danger)',
  })[h as Health] || 'var(--ink-4)';

export const HealthDot = ({ health, size = 8 }: { health: Health | string; size?: number }) => {
  const c = healthColor(health);
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: c,
        boxShadow: `0 0 0 3px ${c}22`,
      }}
    />
  );
};

type AvatarSubject = { avatar: string; color: string };

export const Avatar = ({ s, size = 32 }: { s: AvatarSubject; size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: s.color,
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      flex: '0 0 auto',
      fontFamily: 'var(--sans)',
    }}
  >
    {s.avatar}
  </div>
);

export const Eyebrow = ({
  children,
  color = 'var(--ink-4)',
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      color,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '.16em',
      fontWeight: 500,
      fontFamily: 'var(--mono)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const PulseDot = ({
  color = 'var(--gold-2)',
  size = 8,
}: {
  color?: string;
  size?: number;
}) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
    <span
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: color,
        opacity: 0.45,
        animation: 'strummy-pulse 1.8s ease-out infinite',
      }}
    />
    <span
      style={{
        position: 'absolute',
        inset: size * 0.2,
        borderRadius: '50%',
        background: color,
      }}
    />
  </span>
);

export const TimeAgo = ({
  minutes,
  color = 'var(--ink-4)',
}: {
  minutes: number;
  color?: string;
}) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) return <span style={{ color }}>{Math.floor(h / 24)}d ago</span>;
  if (h > 0)
    return (
      <span style={{ color }}>
        {h}h {m}m ago
      </span>
    );
  return <span style={{ color }}>{minutes}m ago</span>;
};
