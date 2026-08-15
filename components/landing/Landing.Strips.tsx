import { getTranslations } from 'next-intl/server';

import { Display, Eyebrow, LandingContainer, SectionKicker } from './Landing.primitives';
import { LandingReveal } from './Landing.Reveal';

const INTEGRATION_NAMES = ['Google Calendar', 'Ultimate Guitar', 'Spotify', 'YouTube'];

/** "Works with" — text wordmark cards for the tools already integrated. */
export const IntegrationsBar = async () => {
  const t = await getTranslations('Landing.strips');
  const integrations = INTEGRATION_NAMES.map((name, i) => ({
    name,
    sub: t(`integration${i}Sub`),
  }));

  return (
    <div
      style={{
        padding: '56px 0',
        background: 'var(--ivory)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <LandingContainer>
        <div className="ui-land-integrations">
          <LandingReveal>
            <div>
              <Eyebrow style={{ marginBottom: 10 }}>{t('worksWith')}</Eyebrow>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 24,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  color: 'var(--ink)',
                }}
              >
                {t('worksWithHeadline')}
              </div>
            </div>
          </LandingReveal>
          <div className="ui-land-cols-4">
            {integrations.map((i, idx) => (
              <LandingReveal key={i.name} delay={idx * 0.06}>
                <div
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
              </LandingReveal>
            ))}
          </div>
        </div>
      </LandingContainer>
    </div>
  );
};

// Re-measured 2026-08-01: 157 GitHub releases, 393 songs live in production,
// 3,845 tests across 294 suites. The previous values understated the first and
// third ("110+", "3,200+") and overstated the second — the library has never
// held 400 songs. Round DOWN, so every claim stays true as the numbers move.
const METRIC_VALUES = ['150+', '390+', '3,800+', '100%'];

/** Honest numbers strip. */
export const MetricsStrip = async () => {
  const t = await getTranslations('Landing.strips');
  const metrics = METRIC_VALUES.map((v, i) => ({
    v,
    u: t(`metric${i}Label`),
    fn: t(`metric${i}Footnote`),
  }));

  return (
    <div style={{ padding: '96px 0', background: 'var(--ivory)' }}>
      <LandingContainer>
        <LandingReveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionKicker align="center">{t('honestNumbers')}</SectionKicker>
            <Display sizeClass="ui-land-display-48" align="center">
              {t('honestNumbersPrefix')}
              <em style={{ color: 'var(--gold-2)' }}>{t('honestNumbersEmphasis')}</em>
              {t('honestNumbersSuffix')}
            </Display>
          </div>
        </LandingReveal>
        <div className="ui-land-metrics">
          {metrics.map((s, i) => (
            <LandingReveal key={s.u} delay={i * 0.08}>
              <div className="ui-land-metric">
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
                <div
                  style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 10, lineHeight: 1.4 }}
                >
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
              </div>
            </LandingReveal>
          ))}
        </div>
      </LandingContainer>
    </div>
  );
};
