import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer, SectionKicker } from './Landing.primitives';

/** "How it works" — three numbered habits, with the status-flow pills on step 2. */
export const HowItWorks = async () => {
  const t = await getTranslations('Landing.howItWorks');

  const steps = [
    { n: '01', title: t('step1Title'), body: t('step1Body'), chip: t('step1Chip') },
    {
      n: '02',
      title: t('step2Title'),
      body: t('step2Body'),
      flow: [t('flowToLearn'), t('flowStarted'), t('flowRemembered'), t('flowMastered')],
    },
    { n: '03', title: t('step3Title'), body: t('step3Body'), chip: t('step3Chip') },
  ];

  return (
    <div
      id="how-it-works"
      style={{
        padding: '100px 0',
        background: 'var(--paper)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        scrollMarginTop: 80,
      }}
    >
      <LandingContainer>
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <SectionKicker>{t('kicker')}</SectionKicker>
          <Display sizeClass="ui-land-display-48" style={{ marginBottom: 16 }}>
            {t('headlinePrefix')}
            <em style={{ color: 'var(--gold-2)' }}>{t('headlineEmphasis')}</em>
          </Display>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-3)', maxWidth: 560 }}>
            {t('subheadline')}
          </div>
        </div>
        <div className="ui-land-cols-3">
          {steps.map((s) => (
            <div key={s.n} style={{ paddingTop: 24, borderTop: '1px solid var(--rule)' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  color: 'var(--gold-2)',
                  letterSpacing: '.1em',
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 24,
                  letterSpacing: '-0.02em',
                  marginTop: 14,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  color: 'var(--ink-3)',
                  lineHeight: 1.6,
                  marginTop: 12,
                  textWrap: 'pretty',
                }}
              >
                {s.body}
              </div>
              {s.chip && (
                <div
                  style={{
                    marginTop: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    background: 'var(--card)',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }}
                  />
                  {s.chip}
                </div>
              )}
              {s.flow && (
                <div
                  style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}
                >
                  {s.flow.map((f, i) => (
                    <Fragment key={f}>
                      {i > 0 && (
                        <span style={{ color: 'var(--ink-4)', margin: '0 6px', fontSize: 12 }}>
                          →
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          padding: '5px 10px',
                          borderRadius: 6,
                          whiteSpace: 'nowrap',
                          color: i === 1 ? '#1a1613' : 'var(--ink-3)',
                          background: i === 1 ? 'var(--gold)' : 'var(--card)',
                          border: `1px solid ${i === 1 ? 'var(--gold)' : 'var(--rule)'}`,
                          fontWeight: i === 1 ? 600 : 400,
                        }}
                      >
                        {f}
                      </span>
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </LandingContainer>
    </div>
  );
};
