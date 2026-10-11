import type { CSSProperties, ReactNode } from 'react';

/** Shared chrome for the Claude Design student dashboard cards. */

export const eyebrow: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.16em',
  color: 'var(--ink-4)',
};

export const cardTitle: CSSProperties = { fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 };

export const HomeCard = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <section
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '22px 24px',
      boxShadow: 'var(--shadow-sm)',
      minWidth: 0,
      ...style,
    }}
  >
    {children}
  </section>
);
