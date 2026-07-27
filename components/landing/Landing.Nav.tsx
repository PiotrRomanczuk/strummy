import { CtaLink, PlayGlyph, Wordmark } from './Landing.primitives';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For teachers', href: '#for-teachers' },
  { label: 'Changelog', href: 'https://github.com/PiotrRomanczuk/strummy/releases' },
];

/** Sticky, blurred top nav. Link row collapses away below 860px (CSS). */
export const LandingNav = () => (
  <div className="ui-land-nav">
    <div className="ui-land-nav-inner">
      <Wordmark />

      <nav className="ui-land-nav-links">
        {NAV_LINKS.map((l) => (
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

      <a href="/sign-in" className="ui-land-link ui-land-nav-secondary" style={{ marginRight: 4 }}>
        Sign in
      </a>
      <span className="ui-land-nav-secondary">
        <CtaLink href="/sign-in" variant="ghost">
          <PlayGlyph />
          Try the demo
        </CtaLink>
      </span>
      <CtaLink href="/sign-up">Get started — free</CtaLink>
    </div>
  </div>
);
