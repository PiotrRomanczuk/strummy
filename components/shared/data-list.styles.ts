import type { CSSProperties } from 'react';

/** Presentation for `DataList` — split out to keep the component under the
 *  200-line limit; nothing here is domain-specific. */

export const cardStyle: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

export const headerStyle: CSSProperties = {
  gap: 14,
  padding: '12px 20px',
  borderBottom: '1px solid var(--rule)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: 'var(--ink-4)',
};

export const emptyStyle: CSSProperties = {
  padding: '48px 24px',
  textAlign: 'center',
  color: 'var(--ink-4)',
  fontStyle: 'italic',
  fontFamily: 'var(--serif)',
  fontSize: 15,
};

export const rowStyle: CSSProperties = {
  position: 'relative',
  gap: 14,
  padding: '14px 20px',
  color: 'inherit',
  alignItems: 'center',
};

export const selectedRowStyle = (selected: boolean): CSSProperties => ({
  borderBottom: '1px solid var(--rule)',
  background: selected ? 'var(--gold-tint)' : 'transparent',
  boxShadow: selected ? 'inset 3px 0 0 var(--gold)' : 'none',
});

/**
 * Both `position` and `pointerEvents` are set inline deliberately: the
 * `.ui-datalist-linkrow` rule blanks pointer events on every direct child so
 * clicks fall through to this link, and an inline style is what exempts the
 * link itself (and `DataListActionCell`) from its own rule.
 */
export const stretchedLinkStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  textDecoration: 'none',
  pointerEvents: 'auto',
};

export const sortLinkStyle = (active: boolean): CSSProperties => ({
  color: active ? 'var(--gold-2)' : 'inherit',
  textDecoration: 'none',
});

/** Carries the grid template to CSS. Cast because `--cols` is not a known key. */
export const cols = (template: string): CSSProperties =>
  ({ ['--cols']: template }) as unknown as CSSProperties;
