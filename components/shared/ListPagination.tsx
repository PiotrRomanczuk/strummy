import Link from 'next/link';
import type { CSSProperties } from 'react';

/**
 * Server-side pagination for a browsable list — see
 * `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md` §3.4.
 *
 * No numbered page links: at this scale they cost layout and buy little. The
 * disabled ends stay in the DOM rather than unmounting, so the control does not
 * jump around as you page through.
 */

const linkStyle = (enabled: boolean): CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid var(--rule)',
  fontSize: 12,
  fontFamily: 'var(--sans)',
  color: enabled ? 'var(--ink)' : 'var(--ink-5)',
  textDecoration: 'none',
  pointerEvents: enabled ? 'auto' : 'none',
  opacity: enabled ? 1 : 0.5,
});

type Props = {
  page: number;
  totalPages: number;
  /** Build the href for a given page — the domain's own `buildHref`. */
  hrefForPage: (page: number) => string;
  labels: { prev: string; next: string; status: string };
};

export const ListPagination = ({ page, totalPages, hrefForPage, labels }: Props) => {
  // One page needs no controls; rendering an all-disabled pager is noise.
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
      }}
    >
      <Link
        href={hrefForPage(page - 1)}
        aria-disabled={!hasPrev}
        style={linkStyle(hasPrev)}
      >
        {labels.prev}
      </Link>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          color: 'var(--ink-4)',
        }}
      >
        {labels.status}
      </span>
      <Link
        href={hrefForPage(page + 1)}
        aria-disabled={!hasNext}
        style={linkStyle(hasNext)}
      >
        {labels.next}
      </Link>
    </div>
  );
};
