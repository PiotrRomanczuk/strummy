import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Display, LandingContainer, SectionKicker } from './Landing.primitives';

/** Founder story — portrait + first-person quote. */
export const FounderStory = async () => {
  const t = await getTranslations('Landing.founder');

  return (
    <div
      style={{
        padding: '96px 0',
        background: 'var(--paper)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <LandingContainer>
        <div className="ui-land-founder-grid">
          <div className="ui-land-feature-shot">
            <div
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                border: '1px solid var(--rule)',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Image
                src="/landing/founder.jpg"
                alt={t('photoAlt')}
                fill
                sizes="(max-width: 900px) 100vw, 480px"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              {t('location')}
            </div>
          </div>

          <div className="ui-land-feature-copy">
            <SectionKicker>{t('kicker')}</SectionKicker>
            <Display sizeClass="ui-land-display-44" style={{ marginBottom: 24 }}>
              {t('headlinePrefix')}
              <em style={{ color: 'var(--gold-2)' }}>{t('headlineEmphasis')}</em>
              {t('headlineSuffix')}
            </Display>
            <div
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--ink-2)',
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                marginBottom: 22,
                textWrap: 'pretty',
              }}
            >
              {t('quote')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>Piotr</span>
              {t('bylineSuffix')}
            </div>
          </div>
        </div>
      </LandingContainer>
    </div>
  );
};
