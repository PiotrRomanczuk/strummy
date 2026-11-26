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
export const SONGS_TEMPLATE = (hasAction: boolean, isCompact = false): string => {
  // Compact (detail panel open) drops mastery + added — see `SongRowCells`.
  const columns = isCompact
    ? 'minmax(0, 1fr) 130px 150px 48px 64px'
    : 'minmax(0, 1fr) 160px 150px 48px 64px 104px 72px';
  return hasAction ? `${columns} auto` : columns;
};

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

/** "Jul 23" / "23 lip" — the app locale, passed in by the row. */
export const formatAdded = (iso: string | null, locale = 'en'): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale.startsWith('en') ? 'en-US' : locale, {
    month: 'short',
    day: 'numeric',
  });
};
