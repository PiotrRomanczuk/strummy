import type { CSSProperties, ReactNode } from 'react';

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

const cardStyle: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  gap: 14,
  padding: '12px 20px',
  borderBottom: '1px solid var(--rule)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: 'var(--ink-4)',
};

const emptyStyle: CSSProperties = {
  padding: '48px 24px',
  textAlign: 'center',
  color: 'var(--ink-4)',
  fontStyle: 'italic',
  fontFamily: 'var(--serif)',
  fontSize: 15,
};

const rowStyle: CSSProperties = {
  position: 'relative',
  gap: 14,
  padding: '14px 20px',
  color: 'inherit',
  alignItems: 'center',
};

/** Carries the grid template to CSS. Cast because `--cols` is not a known key. */
const cols = (template: string): CSSProperties =>
  ({ ['--cols']: template }) as unknown as CSSProperties;

export type DataListColumn = {
  /** Header label. Empty string reserves the cell without printing a heading. */
  label: string;
  /** Right-align numeric / terminal columns. */
  align?: 'left' | 'right';
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
              <span
                key={`${c.label}-${i}`}
                style={c.align === 'right' ? { textAlign: 'right' } : undefined}
              >
                {c.label}
              </span>
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
};

export const DataListRow = ({ template, children, mobileMeta, detail }: DataListRowProps) => (
  <div style={{ borderBottom: '1px solid var(--rule)' }}>
    <div className={`ui-row ui-datalist-grid`} style={{ ...rowStyle, ...cols(template) }}>
      {children}
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
