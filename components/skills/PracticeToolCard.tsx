import Link from 'next/link';

/**
 * One tool on the practice hub: a link tile with an optional trailing pill.
 *
 * Hover/focus lives in `.ui-quick-action` (design-tokens.css) rather than
 * inline, per the styling convention — inline styles cannot express `:hover`,
 * and a second tool is expected to land here, so the tile is a component
 * rather than markup inlined in the page.
 */
type Props = {
  href: string;
  title: string;
  body: string;
  /** Trailing badge (e.g. "5 due"). Omitted when there is nothing to flag. */
  badge?: string;
};

export const PracticeToolCard = ({ href, title, body, badge }: Props) => (
  <Link
    href={href}
    className="ui-quick-action"
    style={{
      display: 'block',
      padding: '16px 18px',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      background: 'var(--card)',
      textDecoration: 'none',
      color: 'var(--ink)',
    }}
  >
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
    >
      <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>{title}</span>
      {badge && (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            color: 'var(--gold-2)',
            border: '1px solid var(--gold-2)',
            borderRadius: 999,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {badge}
        </span>
      )}
    </div>
    <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>{body}</p>
  </Link>
);
