import { SchoolsDayComparison } from './ForSchools.DayComparison';
import { SchoolsFaq } from './ForSchools.Faq';
import { SchoolsFeatures } from './ForSchools.Features';
import { SchoolsFinalCta } from './ForSchools.FinalCta';
import { SchoolsFooter } from './ForSchools.Footer';
import { SchoolsFounder } from './ForSchools.Founder';
import { SchoolsHero } from './ForSchools.Hero';
import { SchoolsNav } from './ForSchools.Nav';
import { SchoolsPricing } from './ForSchools.Pricing';

/**
 * `/for-schools` — the landing page for a school with a team of teachers,
 * rather than for one teacher (`/for-teachers` and `/`).
 *
 * Same ivory/gold design system as the main landing page, so it follows the
 * visitor's light/dark preference through the shared tokens. The caller wraps
 * it in `.theme-strummy` plus the font variables.
 */
export const ForSchools = () => (
  <div
    style={{
      width: '100%',
      background: 'var(--ivory)',
      color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      minHeight: '100vh',
    }}
  >
    <SchoolsNav />
    <main>
      <SchoolsHero />
      <SchoolsDayComparison />
      <SchoolsFeatures />
      <SchoolsPricing />
      <SchoolsFounder />
      <SchoolsFaq />
      <SchoolsFinalCta />
    </main>
    <SchoolsFooter />
  </div>
);
