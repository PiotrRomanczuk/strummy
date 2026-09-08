import { getTranslations } from 'next-intl/server';

import { CtaLink, LandingContainer } from '@/components/landing/Landing.primitives';

import { SCHOOL_ANCHORS } from './for-schools.data';
import { SchoolsTimetable } from './ForSchools.Timetable';

/** Headline, the two calls to action, and the sample Thursday beside them. */
export const SchoolsHero = async () => {
  const t = await getTranslations('ForSchools.hero');

  return (
    <div style={{ padding: '72px 0 88px' }}>
      <LandingContainer>
        <div className="ui-land-hero-grid">
          <div>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--gold-2)',
                margin: '0 0 18px',
              }}
            >
              {t('kicker')}
            </p>

            <h1
              className="ui-land-h1"
              style={{
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
                margin: '0 0 20px',
                textWrap: 'balance',
              }}
            >
              {t('headline')}
            </h1>

            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                color: 'var(--ink-3)',
                maxWidth: '56ch',
                margin: '0 0 28px',
              }}
            >
              {t('lede')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <CtaLink href={`#${SCHOOL_ANCHORS.call}`} size="lg">
                {t('ctaPrimary')}
              </CtaLink>
              <CtaLink href={`#${SCHOOL_ANCHORS.pricing}`} variant="ghost" size="lg">
                {t('ctaSecondary')}
              </CtaLink>
            </div>

            <p
              style={{
                margin: '28px 0 0',
                paddingLeft: 14,
                borderLeft: '2px solid var(--rule)',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--ink-4)',
                maxWidth: '46ch',
              }}
            >
              {t('proof')}
            </p>
          </div>

          <SchoolsTimetable />
        </div>
      </LandingContainer>
    </div>
  );
};
