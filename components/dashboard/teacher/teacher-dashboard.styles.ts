import type { CSSProperties } from 'react';

/** Card + eyebrow styles shared by the dashboard's side-column cards. */
export const card: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 14,
  padding: '18px 20px',
  boxShadow: 'var(--shadow-sm)',
};
export const eyebrow: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  fontWeight: 500,
  color: 'var(--ink-4)',
};
