import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  cardStyle,
  cols,
  emptyStyle,
  headerStyle,
  rowStyle,
  selectedRowStyle,
  sortLinkStyle,
  stretchedLinkStyle,
} from './data-list.styles';

/**
 * The one list-table primitive.
 *
 * Songs, Lessons and Assignments each grew their own copy of this layout —
 * same card shell, same uppercase header strip, same `ui-row` grid, same
 * mobile collapse — with three bespoke column strings and, between them, two
 * different `Card` definitions plus one page using none at all. Repertoire
 * never got a table and shipped a full editor per row instead, which is what
 * made a 31-song repertoire unreadable.
 *
 * A page supplies its column template and its cells; everything about how a
 * list *looks* lives here. Migrating the remaining pages onto it is a
 * follow-up — this exists so Repertoire does not become a fourth private copy.
 *
 * The column template arrives as the `--cols` custom property rather than a
 * Tailwind arbitrary value: Tailwind's scanner only sees class names that
 * appear literally in source, so `md:grid-cols-[${template}]` composed at
 * runtime would compile to nothing and the grid would silently not apply.
 * The responsive behaviour lives in `.ui-datalist-grid` in design-tokens.css.
 */

export type DataListColumn = {
  /** Header label. Empty string reserves the cell without printing a heading. */
  label: string;
  /** Right-align numeric / terminal columns. */
  align?: 'left' | 'right';
  /**
   * Makes the heading a sort link. Omit for columns that cannot be sorted —
   * derived or aggregate columns (a computed average, a progress bar) have no
   * server-side ordering, and a header that looks clickable but reorders
   * nothing is worse than a plain label.
   *
   * `direction` is the direction currently applied *by this column*, or `null`
   * when some other column owns the sort. Build both with `resolveSortLink`.
   */
  sort?: {
    href: string;
    direction: 'asc' | 'desc' | null;
  };
};

const DataListHeaderCell = ({ column }: { column: DataListColumn }) => {
  const align = column.align === 'right' ? ({ textAlign: 'right' } as const) : undefined;
  if (!column.sort) return <span style={align}>{column.label}</span>;

  const { href, direction } = column.sort;
  return (
    <span style={align}>
      <Link href={href} style={sortLinkStyle(direction !== null)}>
        {column.label}
        {direction && <span style={{ marginLeft: 4 }}>{direction === 'desc' ? '↓' : '↑'}</span>}
      </Link>
    </span>
  );
};

type DataListProps = {
  columns: DataListColumn[];
  /** Grid template matching `columns`, e.g. `'1fr 200px 90px'`. */
  template: string;
  /** Rendered instead of the header and rows when there is nothing to show. */
  empty?: ReactNode;
  children?: ReactNode;
};

export const DataList = ({ columns, template, empty, children }: DataListProps) => {
  const hasRows = Array.isArray(children) ? children.flat().some(Boolean) : Boolean(children);

  return (
    <div style={cardStyle}>
      {!hasRows ? (
        <div style={emptyStyle}>{empty}</div>
      ) : (
        <>
          {/* Header is desktop-only: once the grid collapses there are no
              columns left for it to label. */}
          <div
            className="ui-datalist-grid ui-datalist-desktop"
            style={{ ...headerStyle, ...cols(template) }}
          >
            {columns.map((c, i) => (
              <DataListHeaderCell key={`${c.label}-${i}`} column={c} />
            ))}
          </div>
          {children}
        </>
      )}
    </div>
  );
};

type DataListRowProps = {
  template: string;
  children: ReactNode;
  /**
   * One labelled line shown below the title on phones, standing in for the
   * columns hidden there. Without it a collapsed row is just a title.
   */
  mobileMeta?: ReactNode;
  /** Full-width content rendered beneath the row — an expanded panel. */
  detail?: ReactNode;
  /**
   * Turns the whole row into one link, stretched behind every cell.
   *
   * The row cannot simply wrap its cells in a `<Link>`: a `<button>` inside an
   * `<a>` is invalid HTML and would navigate on every click, which is what
   * rules that out for any list carrying a per-row action. Instead the link is
   * absolutely positioned across the row and the cells sit above it ignoring
   * pointer events — see `DataListActionCell` for the escape hatch.
   */
  href?: string;
  /**
   * Accessible name for the row link. Required alongside `href`: the stretched
   * link has no text of its own (the visible title is a sibling cell), so
   * without this the row is an unlabelled link to a screen reader — and no
   * test can select it either.
   */
  label?: string;
  /** Marks this row as the one currently open in the detail panel. */
  selected?: boolean;
  /**
   * Trailing block shown only on phones, beside the title. Carries the one or
   * two numbers worth keeping when the desktop columns collapse — without it a
   * collapsed row is a title and a meta line, which reads as a card rather than
   * a scannable list item.
   */
  mobileTrail?: ReactNode;
  /** Lays the collapsed row out as title + trail on one line. */
  mobileSplit?: boolean;
};

export const DataListRow = ({
  template,
  children,
  mobileMeta,
  detail,
  href,
  label,
  selected = false,
  mobileTrail,
  mobileSplit = false,
}: DataListRowProps) => (
  <div style={selectedRowStyle(selected)}>
    <div
      className={`ui-row ui-datalist-grid${href ? ' ui-datalist-linkrow' : ''}${
        mobileSplit ? ' ui-row-mobile-split' : ''
      }`}
      style={{ ...rowStyle, ...cols(template) }}
    >
      {href && (
        <Link
          href={href}
          aria-label={label}
          aria-current={selected ? 'true' : undefined}
          style={stretchedLinkStyle}
        />
      )}
      {children}
      {mobileTrail && <div className="ui-row-mobile-trail">{mobileTrail}</div>}
      {mobileMeta && (
        <div
          className="ui-datalist-mobile-meta"
          style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: -8 }}
        >
          {mobileMeta}
        </div>
      )}
    </div>
    {detail}
  </div>
);

/**
 * A cell holding something interactive (a button, a menu) inside a row that is
 * itself a link. Re-enables pointer events that `DataListCell` suppresses, and
 * sits above the stretched link so the control receives the click instead of
 * the row navigating.
 */
export const DataListActionCell = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId?: string;
}) => (
  <div
    style={{ position: 'relative', pointerEvents: 'auto', textAlign: 'right' }}
    data-testid={testId}
  >
    {children}
  </div>
);

/** Title cell — the one every list has, styled identically everywhere. */
export const DataListTitle = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      fontFamily: 'var(--serif)',
      fontStyle: 'italic',
      fontSize: 15,
      color: 'var(--ink)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

/** Secondary cell (author, date, count) — hidden once the grid collapses. */
export const DataListCell = ({
  children,
  align = 'left',
  mono = false,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
}) => (
  <div
    className="ui-datalist-desktop"
    style={{
      textAlign: align,
      fontFamily: mono ? 'var(--mono)' : undefined,
      fontSize: mono ? 12 : 13,
      color: mono ? 'var(--ink-3)' : 'var(--ink-2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);
