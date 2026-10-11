import type { CSSProperties } from 'react';

/** Claude Design Song Form A `FIELD_STYLE`, plus the gold "filled" variant. */
export const songInput: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '9px 12px',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
  outline: 'none',
  boxSizing: 'border-box',
};

export const songMonoInput: CSSProperties = { ...songInput, fontFamily: 'var(--mono)' };

/** A field holding a value turns gold, as every filled field does in the mockup. */
export const filled = (style: CSSProperties, isFilled: boolean): CSSProperties =>
  isFilled ? { ...style, background: 'var(--gold-tint)', borderColor: 'var(--gold-dim)' } : style;

export const songSegmentBtn = (active: boolean): CSSProperties => ({
  flex: 1,
  minWidth: 0,
  padding: '8px 4px',
  fontSize: 11,
  borderRadius: 8,
  cursor: 'pointer',
  border: '1px solid var(--rule)',
  background: active ? 'var(--ink)' : 'var(--card)',
  color: active ? 'var(--paper)' : 'var(--ink-3)',
  textTransform: 'capitalize',
  fontWeight: active ? 500 : 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** The bordered strip that holds chips (chords) or beats (strumming). */
export const songChipBox: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  padding: '8px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: 'var(--card)',
  minHeight: 42,
  boxSizing: 'border-box',
};
