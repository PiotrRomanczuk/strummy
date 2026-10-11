import type { CSSProperties } from 'react';

/** Claude Design `btnGhost` / `btnPrimary` for the song hero's action row. */
export const songGhostButton: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  color: 'var(--ink-2)',
  fontSize: 12,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  textDecoration: 'none',
  fontFamily: 'var(--sans)',
};

export const songPrimaryButton: CSSProperties = {
  ...songGhostButton,
  padding: '8px 14px',
  border: 'none',
  background: 'var(--ink)',
  color: 'var(--paper)',
  fontSize: 13,
  fontWeight: 500,
};
