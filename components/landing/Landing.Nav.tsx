import { getTranslations } from 'next-intl/server';

import { CtaLink, PlayGlyph, Wordmark } from './Landing.primitives';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

/** Sticky, blurred top nav. Link row collapses away below 860px (CSS). */
export const LandingNav = async () => {
  const t = await getTranslations('Landing.nav');

  const navLinks = [
    { label: t('features'), href: '#features' },
    { label: t('howItWorks'), href: '#how-it-works' },
    { label: t('forTeachers'), href: '#for-teachers' },
    { label: t('changelog'), href: 'https://github.com/PiotrRomanczuk/strummy/releases' },
  ];

  return (
    <div className="ui-land-nav">
      <div className="ui-land-nav-inner">
        <Wordmark />

        <nav className="ui-land-nav-links">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="ui-land-link"
              {...(l.href.startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <span className="ui-land-nav-secondary" style={{ marginRight: 4 }}>
          <LanguageToggle />
        </span>

        <a
          href="/sign-in"
          className="ui-land-link ui-land-nav-secondary"
          style={{ marginRight: 4 }}
        >
          {t('signIn')}
        </a>
        <span className="ui-land-nav-secondary">
          {/* `?demo=true` is what actually starts the demo — the sign-in page
              only auto-fills and submits the demo credentials when it sees it.
              Without it this button was indistinguishable from "Sign in", and
              a visitor who came to try the product landed on an empty login
              form and had to find a second button to get anywhere. */}
          <CtaLink href="/sign-in?demo=true" variant="ghost">
            <PlayGlyph />
            {t('tryTheDemo')}
          </CtaLink>
        </span>
        <CtaLink href="/sign-in?demo=true">{t('getStarted')}</CtaLink>
      </div>
    </div>
  );
};
