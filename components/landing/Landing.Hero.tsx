import { BrowserFrame } from './Landing.frames';
import { HeroFloatChord, HeroFloatActivity } from './Landing.Hero.Floats';
import { HeroCopy } from './Landing.Hero.Copy';
import { HeroDashboard } from './Landing.HeroDashboard';
import { LandingReveal } from './Landing.Reveal';

/** Split-screen hero: serif typography + role toggle left, mock dashboard in a browser frame right. */
export const LandingHero = () => (
  <div style={{ position: 'relative', padding: '72px 0 120px', overflow: 'hidden' }}>
    <div className="ui-land-container">
      <div className="ui-land-hero-grid">
        <LandingReveal>
          <HeroCopy />
        </LandingReveal>

        <LandingReveal delay={0.15}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-80px -40px',
                background:
                  'radial-gradient(50% 55% at 55% 45%, var(--gold-tint), transparent 70%)',
                opacity: 0.9,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <BrowserFrame url="strummy.online/dashboard" height={420}>
                <HeroDashboard />
              </BrowserFrame>
            </div>

            <HeroFloatChord />
            <HeroFloatActivity />
          </div>
        </LandingReveal>
      </div>
    </div>
  </div>
);
