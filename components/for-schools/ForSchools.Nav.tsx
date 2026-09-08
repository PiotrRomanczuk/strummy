import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { CtaLink, Wordmark } from '@/components/landing/Landing.primitives';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

import { SCHOOL_ANCHORS } from './for-schools.data';

/** Sticky nav. Same chrome as the landing page, with the audience spelled out. */
export const SchoolsNav = async () => {
  const t = await getTranslations('ForSchools.nav');

  return (
    <div className="ui-land-nav">
      <div className="ui-land-nav-inner">
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', gap: 8 }}>
          <Wordmark />
          <span
            style={{
              alignSelf: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '.1em',
              color: 'var(--gold-2)',
            }}
          >
            {t('badge')}
          </span>
        </Link>

        <nav className="ui-land-nav-links">
          <a href={`#${SCHOOL_ANCHORS.how}`} className="ui-land-link">
            {t('howItWorks')}
          </a>
          <a href={`#${SCHOOL_ANCHORS.pricing}`} className="ui-land-link">
            {t('pricing')}
          </a>
        </nav>

        <div style={{ flex: 1 }} />

        <span className="ui-land-nav-secondary" style={{ marginRight: 4 }}>
          <LanguageToggle />
        </span>
        <CtaLink href={`#${SCHOOL_ANCHORS.call}`} variant="ghost">
          {t('cta')}
        </CtaLink>
      </div>
    </div>
  );
};
