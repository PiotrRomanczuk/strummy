import { getTranslations } from 'next-intl/server';

import { CtaLink, Display, LandingContainer } from './Landing.primitives';

/** Beta pricing card. */
export const BetaCard = async () => {
  const t = await getTranslations('Landing.betaCard');

  return (
    <div style={{ padding: '80px 0 40px', background: 'var(--ivory)' }}>
      <LandingContainer>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            border: '1px solid var(--rule)',
            borderRadius: 16,
            background: 'var(--card)',
            padding: '40px 44px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 160,
              height: 160,
              background: 'radial-gradient(circle, var(--gold-tint) 0%, transparent 70%)',
              opacity: 0.8,
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 18,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'var(--gold-tint)',
                  color: 'var(--gold-2)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                {t('badge')}
              </span>
              <span style={{ color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                v0.113 · Jul 2026
              </span>
            </div>
            <Display sizeClass="ui-land-display-34" style={{ marginBottom: 14 }}>
              {t('headline')}
            </Display>
            <div
              style={{
                fontSize: 15,
                color: 'var(--ink-3)',
                lineHeight: 1.55,
                marginBottom: 22,
                maxWidth: 540,
                textWrap: 'pretty',
              }}
            >
              {t('body')}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <CtaLink href="/sign-up">{t('startFree')}</CtaLink>
              <CtaLink href="https://github.com/PiotrRomanczuk/strummy/releases" variant="ghost">
                {t('seeShipped')}
              </CtaLink>
            </div>
          </div>
        </div>
      </LandingContainer>
    </div>
  );
};
