import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { SubBand } from './sections/SubBand';
import { LogoCloud } from './sections/LogoCloud';
import { Reality } from './sections/Reality';
import { Capabilities } from './sections/Capabilities';
import { Efficiency } from './sections/Efficiency';
import { WorkflowTimeline } from './sections/WorkflowTimeline';
import { Pricing } from './sections/Pricing';
import { FAQ } from './sections/FAQ';
import { FinalCTA } from './sections/FinalCTA';
import { Footer } from './sections/Footer';

export function LandingPage() {
  return (
    <div className="landing-editorial min-h-screen bg-[var(--l-paper)] font-sans text-[var(--l-ink)]">
      <Header />
      <main>
        <Hero />
        <SubBand />
        <LogoCloud />
        <Reality />
        <Capabilities />
        <Efficiency />
        <WorkflowTimeline />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
