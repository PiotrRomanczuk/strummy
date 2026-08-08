import type { CSSProperties } from 'react';

export const COLUMNS_CLASS = 'grid grid-cols-1 md:grid-cols-[1fr_150px_110px_60px_80px_90px_90px]';
export const COLUMNS_WITH_ACTION_CLASS =
  'grid grid-cols-1 md:grid-cols-[1fr_150px_110px_60px_80px_90px_90px_auto]';

/**
 * Cells sit above a stretched link and ignore pointer events, so the whole row
 * still navigates while the action cell stays clickable. The row cannot simply
 * wrap everything in a <Link> any more — a <button> inside an <a> is invalid
 * HTML and would navigate on every click.
 */
export const cellOverlay: CSSProperties = { position: 'relative', pointerEvents: 'none' };

const truncate: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const wrapperStyle = (isSelected: boolean): CSSProperties => ({
  borderBottom: '1px solid var(--rule)',
  background: isSelected ? 'var(--gold-tint)' : 'transparent',
  boxShadow: isSelected ? 'inset 3px 0 0 var(--gold)' : 'none',
});

export const rowStyle: CSSProperties = {
  position: 'relative',
  gap: 14,
  padding: '14px 20px',
  color: 'inherit',
  alignItems: 'center',
};

export const stretchedLinkStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  textDecoration: 'none',
};

export const titleStyle: CSSProperties = {
  ...cellOverlay,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
};

export const titleTextStyle: CSSProperties = {
  ...truncate,
  fontFamily: 'var(--serif)',
  fontStyle: 'italic',
  fontSize: 15,
  color: 'var(--ink)',
  display: 'block',
};

export const titleMetaStyle: CSSProperties = {
  ...truncate,
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginTop: 2,
};

export const mobileMetaStyle: CSSProperties = {
  ...cellOverlay,
  fontSize: 12,
  color: 'var(--ink-3)',
  marginTop: -8,
};

export const authorStyle: CSSProperties = {
  ...cellOverlay,
  ...truncate,
  fontSize: 13,
  color: 'var(--ink-2)',
};

export const levelStyle: CSSProperties = {
  ...cellOverlay,
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--ink-3)',
};

export const keyStyle: CSSProperties = {
  ...cellOverlay,
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--ink-3)',
};

export const learnersStyle: CSSProperties = {
  ...cellOverlay,
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--ink-3)',
};

export const addedStyle: CSSProperties = {
  ...cellOverlay,
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--ink-4)',
};

export const formatAdded = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
