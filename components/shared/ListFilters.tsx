import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/**
 * The shared filter-bar vocabulary: a chip row, a field label, and the bar
 * that lays them out.
 *
 * Every list page had its own version of this. Songs and Lessons rendered
 * chips as links; Assignments and Users pushed through the client router — so
 * the same interaction behaved differently (and looked slightly different)
 * depending on which list you were on. Chips are links here, uniformly: they
 * are navigations, they work without JS, and they are shareable as URLs.
 */

/**
 * Claude Design `FilterChip`: square-ish (6px) chips. An active chip with a
 * colour gets that colour's border and a faint wash of it; without one it
 * fills with ink.
 */
const chipStyle = (isActive: boolean, color?: string): CSSProperties => ({
  padding: '5px 10px',
  borderRadius: 6,
  border: `1px solid ${isActive ? (color ?? 'var(--ink)') : 'var(--rule)'}`,
  background: isActive
    ? color
      ? `color-mix(in srgb, ${color} 7%, var(--card))`
      : 'var(--ink)'
    : 'var(--card)',
  fontSize: 12,
  fontWeight: isActive ? 500 : 400,
  color: isActive ? (color ?? 'var(--paper)') : 'var(--ink-3)',
  textDecoration: 'none',
  fontFamily: 'var(--sans)',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const countStyle = (isActive: boolean, hasColor: boolean): CSSProperties => ({
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: isActive && !hasColor ? 'rgba(255,255,255,.6)' : 'var(--ink-4)',
});

/** Shared look for selects, text inputs and small buttons in a filter bar. */
export const filterControlStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  fontSize: 12,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
};

export const filterLabelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontFamily: 'var(--mono)',
  whiteSpace: 'nowrap',
};

export type FilterChip = {
  /** Stable key, also used for the active comparison. */
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  /** Optional count shown after the label (e.g. how many match). */
  count?: number;
  /** Optional adornment before the label — the lessons status dot. */
  icon?: ReactNode;
  /** Status colour: tints the chip when active (lessons status chips). */
  color?: string;
};

/**
 * One labelled row of filter chips.
 *
 * `role="button"` + `aria-pressed` because these read as toggles even though
 * they navigate — a screen reader announcing "link" alone would not convey
 * that the filter is currently on.
 */
export const FilterChipRow = ({
  label,
  chips,
  align = 'start',
}: {
  label?: string;
  chips: FilterChip[];
  /** `end` pushes the row to the right of the bar (used for sort). */
  align?: 'start' | 'end';
}) => {
  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginLeft: align === 'end' ? 'auto' : undefined,
      }}
    >
      {label && <span style={filterLabelStyle}>{label}</span>}
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          role="button"
          aria-pressed={chip.isActive}
          className={chip.isActive ? undefined : 'ui-chip'}
          style={chipStyle(chip.isActive, chip.color)}
        >
          {chip.icon}
          {chip.label}
          {/* Explicit space: without it the accessible name runs together as
              "Mastered3", which reads badly and collides with substring-based
              test selectors. */}
          {chip.count !== undefined && (
            <>
              {' '}
              <span style={countStyle(chip.isActive, Boolean(chip.color))}>{chip.count}</span>
            </>
          )}
        </Link>
      ))}
    </div>
  );
};

/**
 * Lays out the rows of a filter bar above a DataList.
 *
 * Rows wrap independently, so a bar with chips plus a search box collapses
 * sensibly on a phone instead of overflowing.
 */
export const FilterBar = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '0 0 16px',
    }}
  >
    {children}
  </div>
);

/** One horizontal row within a FilterBar. */
export const FilterRow = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
);

/**
 * A row of text/select controls in the bordered surface that Songs and
 * Repertoire use. Assignments rendered the same controls bare, so the two
 * pages read differently for no reason — this is the one definition of that
 * container. `ListFiltersForm` applies it internally; use this directly when a
 * page needs its own form element.
 */
export const FilterControlsRow = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: '10px 14px',
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
    }}
  >
    {children}
  </div>
);
