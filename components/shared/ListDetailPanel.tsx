import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/**
 * The slide-in detail panel every browsable list opens when a row is clicked
 * (`?selected=<id>`) — see `docs/app-blueprint/reference/LIST_TABLE_PATTERN.md`.
 *
 * This is the shell only: the chrome, the accessible name, and the two exits
 * every panel must offer. What goes inside is per-domain and belongs to the
 * domain's own `<Domain>List.Panel.tsx`, because a song's key/capo/tempo and a
 * lesson's schedule have nothing in common worth abstracting.
 *
 * The panel is a *lighter* view of the detail page plus the cross-record
 * context the detail page cannot cheaply show. It is not a second detail page —
 * that is what "Open full page" is for.
 */

const chromeLinkStyle: CSSProperties = {
  padding: '5px 8px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  color: 'var(--ink-3)',
  textDecoration: 'none',
};

const openLinkStyle: CSSProperties = {
  ...chromeLinkStyle,
  padding: '5px 10px',
  fontSize: 11.5,
  fontFamily: 'var(--sans)',
};

const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.14em',
};

type Props = {
  /**
   * Accessible name, e.g. `"Song detail: Blackbird"`. Must name the record, not
   * just the panel: the panel's contents duplicate text that also appears in
   * the list, the tab strip and the nav, so tests and screen readers need this
   * to disambiguate. The dashboard sidebar is also a `complementary` landmark.
   */
  label: string;
  /** Small uppercase kicker above the title, e.g. the domain name. */
  eyebrow: string;
  /** Where "Open full page" goes — the record's real detail route. */
  fullPageHref: string;
  /** Where the close control goes — the list with `selected` cleared. */
  closeHref: string;
  labels: { openFullPage: string; close: string };
  children: ReactNode;
};

export const ListDetailPanel = ({
  label,
  eyebrow,
  fullPageHref,
  closeHref,
  labels,
  children,
}: Props) => (
  <aside
    className="songs-panel-slide-in"
    aria-label={label}
    style={{
      flex: '0 0 340px',
      borderLeft: '1px solid var(--rule)',
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={eyebrowStyle}>{eyebrow}</span>
        <div style={{ flex: 1 }} />
        <Link href={fullPageHref} style={openLinkStyle}>
          {labels.openFullPage}
        </Link>
        <Link href={closeHref} aria-label={labels.close} style={chromeLinkStyle}>
          ✕
        </Link>
      </div>
      {children}
    </div>
  </aside>
);
