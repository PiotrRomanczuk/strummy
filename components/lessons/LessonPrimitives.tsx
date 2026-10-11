import type { CSSProperties, ReactNode } from 'react';

import { avatarColorFor } from '@/components/shared/avatar-color.helpers';

export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

export const LessonStatusPill = ({ label, colour }: { label: string; colour: string }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 8px',
      borderRadius: 4,
      // Claude Design `LessonStatusPill`: a faint wash of the status colour.
      background: `color-mix(in srgb, ${colour} 10%, transparent)`,
      color: colour,
      fontSize: 11,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '.08em',
      fontFamily: 'var(--mono)',
    }}
  >
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: colour,
      }}
    />
    {label}
  </span>
);

export const StudentInitials = ({
  name,
  email,
  size = 32,
  color,
}: {
  name: string | null;
  email: string | null;
  size?: number;
  /** Stored `profiles.avatar_color`; falls back to a stable per-name colour. */
  color?: string | null;
}) => {
  const source = (name && name.trim()) || (email && email.trim()) || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?')[0];
  // Claude Design `Avatar`: solid swatch, white sans initials. Decorative —
  // the name always sits next to it, so screen readers skip the initials.
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: avatarColorFor(source, color),
        color: 'var(--on-accent)',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--sans)',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};
