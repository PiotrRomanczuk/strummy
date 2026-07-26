import { StaffLines } from './Landing.art';
import { Display, Eyebrow, LandingContainer, SectionKicker } from './Landing.primitives';

const INTEGRATIONS = [
  { name: 'Google Calendar', sub: 'Lesson sync' },
  { name: 'Ultimate Guitar', sub: 'Tabs attached' },
  { name: 'Spotify', sub: 'Song links' },
  { name: 'YouTube', sub: 'Video references' },
];

/** "Works with" — text wordmark cards for the tools already integrated. */
export const IntegrationsBar = () => (
  <div
    style={{
      padding: '56px 0',
      background: 'var(--ivory)',
      borderTop: '1px solid var(--rule)',
      borderBottom: '1px solid var(--rule)',
    }}
  >
    <LandingContainer>
      <div className="ed-land-integrations">
        <div>
          <Eyebrow style={{ marginBottom: 10 }}>Works with</Eyebrow>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: 'var(--ink)',
            }}
          >
            The tools you already live in.
          </div>
        </div>
        <div className="ed-land-cols-4">
          {INTEGRATIONS.map((i) => (
            <div
              key={i.name}
              style={{
                padding: '18px 20px',
                border: '1px solid var(--rule)',
                borderRadius: 10,
                background: 'var(--card)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {i.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-4)',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                {i.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </LandingContainer>
  </div>
);

const METRICS = [
  { v: '110+', u: 'releases shipped', fn: 'Since 2024, still weekly' },
  { v: '400+', u: 'songs in the library', fn: 'Tabs & chords attached' },
  { v: '3,200+', u: 'automated tests', fn: 'Run on every release' },
  { v: '100%', u: 'of features free in beta', fn: 'No card, no gates' },
];

/** Honest numbers strip. */
export const MetricsStrip = () => (
  <div style={{ padding: '96px 0', background: 'var(--ivory)' }}>
    <LandingContainer>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <SectionKicker align="center">Honest numbers</SectionKicker>
        <Display sizeClass="ed-land-display-48" align="center">
          Small studio, <em style={{ color: 'var(--gold-2)' }}>real software</em>.
        </Display>
      </div>
      <div className="ed-land-metrics">
        {METRICS.map((s) => (
          <div key={s.u} className="ed-land-metric">
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 64,
                fontWeight: 400,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: 'var(--ink)',
              }}
            >
              {s.v}
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
              {s.u}
            </div>
            <div
              style={{
                color: 'var(--ink-4)',
                fontSize: 11,
                marginTop: 6,
                fontFamily: 'var(--mono)',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              {s.fn}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                left: 24,
                right: 24,
                height: 20,
                opacity: 0.2,
              }}
            >
              <StaffLines height={20} color="var(--ink-4)" strokeWidth={0.5} />
            </div>
          </div>
        ))}
      </div>
    </LandingContainer>
  </div>
);
