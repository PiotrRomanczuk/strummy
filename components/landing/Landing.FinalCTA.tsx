import { getTranslations } from 'next-intl/server';

import { FretboardArt } from './Landing.art';
import { ArrowRight, CtaLink, Display, LandingContainer } from './Landing.primitives';
import { LandingReveal } from './Landing.Reveal';

/** Final CTA band on the gold gradient, fretboard art behind. */
export const FinalCTA = async () => {
  const t = await getTranslations('Landing.finalCta');

  return (
    <div
      style={{
        padding: '110px 0',
        background: `linear-gradient(135deg,
        var(--gold-tint) 0%,
        color-mix(in oklab, var(--gold-dim) 35%, var(--paper)) 60%,
        var(--gold-dim) 100%)`,
        borderTop: '1px solid color-mix(in oklab, var(--gold-2) 35%, transparent)',
        borderBottom: '1px solid color-mix(in oklab, var(--gold-2) 35%, transparent)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
          }}
        >
          <FretboardArt frets={24} height={110} color="var(--ink)" />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <LandingContainer>
          <LandingReveal>
            <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-2)',
                  marginBottom: 24,
                }}
              >
                {t('eyebrow')}
              </div>
              <Display sizeClass="ui-land-h1" align="center" style={{ marginBottom: 24 }}>
                {t('headlineLine1')}
                <br />
                <em style={{ color: 'var(--ink-2)' }}>{t('headlineLine2')}</em>
              </Display>
              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: 'var(--ink-2)',
                  maxWidth: 560,
                  margin: '0 auto 36px',
                  textWrap: 'pretty',
                }}
              >
                {t('body')}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* The interest form is the conversion step now: there is no
                    self-service sign-up, so the only thing to ask a visitor
                    for is a way to reach them. */}
                <CtaLink href="/for-teachers" size="lg">
                  {t('getStarted')}
                  <ArrowRight />
                </CtaLink>
                <CtaLink
                  href="/sign-in?demo=true"
                  variant="ghost"
                  size="lg"
                  style={{
                    borderColor: 'color-mix(in oklab, var(--ink) 25%, transparent)',
                    color: 'var(--ink-2)',
                  }}
                >
                  {t('seeDemo')}
                </CtaLink>
              </div>
              {/* Sign-in stays, quietly: existing teachers and their students
                  still need a door, they just are not who this page is for. */}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <a
                  href="/sign-in"
                  data-testid="landing-sign-in"
                  style={{ fontSize: 14, color: 'var(--ink-3)', textDecoration: 'underline' }}
                >
                  {t('signIn')}
                </a>
              </div>
            </div>
          </LandingReveal>
        </LandingContainer>
      </div>
    </div>
  );
};
