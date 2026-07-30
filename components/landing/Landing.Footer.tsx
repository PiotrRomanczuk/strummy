import { Wordmark } from './Landing.primitives';

const COLUMNS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    items: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Changelog', href: 'https://github.com/PiotrRomanczuk/strummy/releases' },
    ],
  },
  {
    title: 'Studio',
    items: [
      { label: 'For teachers', href: '#for-teachers' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Create account', href: '/sign-up' },
    ],
  },
  {
    title: 'Legal',
    items: [{ label: 'Beta notice', href: '#' }],
  },
];

export const LandingFooter = () => (
  <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper)' }}>
    <div className="ui-land-footer-grid">
      <div>
        <div style={{ marginBottom: 10 }}>
          <Wordmark fontSize={26} />
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13, maxWidth: 300, lineHeight: 1.55 }}>
          A quieter kind of studio software. Built in Warsaw by a working guitar teacher.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <a
            href="https://github.com/PiotrRomanczuk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--rule)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/piotr-romanczuk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--rule)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
          </a>
        </div>
      </div>

      {COLUMNS.map((col) => (
        <div key={col.title}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
              marginBottom: 12,
            }}
          >
            {col.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                className="ui-land-link"
                {...(it.href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {it.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="ui-land-footer-base">
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        © 2026 Strummy · Public beta
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
        strummy.online
      </div>
    </div>
  </div>
);
