import type { CSSProperties } from 'react';

/** Hero-size admin card (pulse, at-risk) and the standard secondary card. */
export const adminHero: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 18,
  boxShadow: '0 1px 2px rgba(26,22,19,.04), 0 10px 40px -20px rgba(26,22,19,.08)',
  padding: '28px 30px',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 380,
  minWidth: 0,
};

export const adminCard: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 14,
  padding: '20px 22px',
  boxShadow: 'var(--shadow-sm)',
  minWidth: 0,
};

export const rowRule = (i: number): CSSProperties => ({
  borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
  borderBottom: '1px solid var(--rule)',
});
