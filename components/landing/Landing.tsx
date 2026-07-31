import { DayInTheLife } from './Landing.DayInTheLife';
import { FeatureShowcases } from './Landing.Features';
import { LandingFooter } from './Landing.Footer';
import { LandingHero } from './Landing.Hero';
import { HowItWorks } from './Landing.HowItWorks';
import { LandingNav } from './Landing.Nav';
import { BetaCard } from './Landing.BetaCard';
import { FinalCTA } from './Landing.FinalCTA';
import { FounderStory } from './Landing.Founder';
import { IntegrationsBar, MetricsStrip } from './Landing.Strips';

/**
 * The public marketing landing page — direction (matches the app's
 * ivory/gold dashboard design system). Composition mirrors the "Landing Page
 * Desktop" mockup bundle in `design-mockups/batch-02-incoming/`.
 * The caller wraps it in `.theme-strummy` plus the font variables.
 */
export const Landing = () => (
  <div
    style={{
      width: '100%',
      background: 'var(--ivory)',
      color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      overflow: 'hidden',
      minHeight: '100vh',
    }}
  >
    <LandingNav />
    <main>
      <LandingHero />
      <HowItWorks />
      <DayInTheLife />
      <FeatureShowcases />
      <IntegrationsBar />
      <MetricsStrip />
      <FounderStory />
      <BetaCard />
      <FinalCTA />
    </main>
    <LandingFooter />
  </div>
);
