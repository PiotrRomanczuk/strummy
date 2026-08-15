import type { CSSProperties } from 'react';

/**
 * Grid template for the songs list, fed to `DataList`/`DataListRow` as the
 * `--cols` custom property.
 *
 * It is a template string rather than a Tailwind class because Tailwind's
 * scanner only sees class names that appear literally in source — a
 * `md:grid-cols-[...]` composed at runtime compiles to nothing and the grid
 * silently does not apply. See `.ui-datalist-grid` in design-tokens.css.
 */
export const SONGS_TEMPLATE = (hasAction: boolean): string =>
  hasAction
    ? '1fr 150px 110px 60px 80px 90px 90px auto'
    : '1fr 150px 110px 60px 80px 90px 90px';

/** Category · year kicker under the title. */
export const titleMetaStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginTop: 2,
  display: 'block',
};

export const formatAdded = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
