import type { ReactNode } from 'react';

type Artboard = {
  label: string;
  width: number;
  height: number;
  node: ReactNode;
};

type ArtboardStageProps = {
  title: string;
  subtitle?: string;
  artboards: Artboard[];
};

export const ArtboardStage = ({ title, subtitle, artboards }: ArtboardStageProps) => (
  <div
    style={{
      minHeight: '100vh',
      background: '#f0eee9',
      padding: '56px 32px 96px',
      backgroundImage: 'radial-gradient(circle, rgba(26,22,19,0.06) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      backgroundPosition: '0 0',
    }}
  >
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.16em',
          color: 'var(--ink-4)',
          marginBottom: 6,
        }}
      >
        Editorial design preview
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--serif)',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 6 }}>{subtitle}</div>
      )}

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 64,
          alignItems: 'flex-start',
        }}
      >
        {artboards.map((a, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                letterSpacing: '.04em',
              }}
            >
              {a.label}
            </div>
            <div
              style={{
                width: a.width,
                height: a.height,
                background: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 60px -20px rgba(26,22,19,0.18), 0 4px 12px rgba(26,22,19,0.06)',
                overflow: 'hidden',
              }}
            >
              {a.node}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
