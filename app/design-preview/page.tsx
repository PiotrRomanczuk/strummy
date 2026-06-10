import Link from 'next/link';

const DASHBOARDS = [
  { href: '/design-preview/student', label: 'Student Dashboard', sub: 'desktop · mobile' },
  { href: '/design-preview/teacher', label: 'Teacher Dashboard', sub: 'desktop · mobile' },
  { href: '/design-preview/admin', label: 'Admin Dashboard', sub: 'desktop · mobile' },
];

export default function DesignPreviewIndex() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '64px 32px',
        maxWidth: 720,
        margin: '0 auto',
        fontFamily: 'var(--sans)',
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.16em',
          color: 'var(--ink-4)',
          marginBottom: 8,
        }}
      >
        Strummy · Editorial design preview
      </div>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 44,
          letterSpacing: '-0.02em',
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        Role-specific <em style={{ color: 'var(--gold-2)' }}>dashboards</em>
      </h1>
      <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 12, maxWidth: 520 }}>
        Pixel-faithful ports of the Strummy.html dashboards canvas — sidebar with embedded search,
        string-vibration ambience, fret-progress, tab-rule dividers.
      </p>

      <div
        style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          borderTop: '1px solid var(--rule)',
        }}
      >
        {DASHBOARDS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '20px 4px',
              borderBottom: '1px solid var(--rule)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span style={{ fontFamily: 'var(--serif)', fontSize: 24, fontStyle: 'italic' }}>
              {d.label}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
              {d.sub} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
