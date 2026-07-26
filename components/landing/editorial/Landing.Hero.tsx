import { SAMPLE_STUDENTS } from './landing.data';
import { StaffLines } from './Landing.art';
import { BrowserFrame } from './Landing.frames';
import { HeroFloatChord, HeroFloatActivity } from './Landing.Hero.Floats';
import { HeroDashboard } from './Landing.HeroDashboard';
import { ArrowRight, CtaLink, PlayGlyph, SampleAvatar } from './Landing.primitives';

/** Split-screen hero: serif typography left, mock dashboard in a browser frame right. */
export const LandingHero = () => (
  <div style={{ position: 'relative', padding: '72px 0 120px', overflow: 'hidden' }}>
    <div
      style={{
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        height: 32,
        opacity: 0.18,
        pointerEvents: 'none',
      }}
    >
      <StaffLines height={32} color="var(--ink-4)" strokeWidth={0.6} />
    </div>

    <div className="ed-land-container">
      <div className="ed-land-hero-grid">
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 12px 4px 4px',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              background: 'var(--card)',
              marginBottom: 36,
            }}
          >
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                background: 'var(--gold-tint)',
                color: 'var(--gold-2)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              Public beta
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Free for teachers — no card.
            </span>
          </div>

          <h1
            className="ed-land-h1"
            style={{
              margin: '0 0 32px',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: '-0.028em',
              color: 'var(--ink)',
              textWrap: 'balance',
            }}
          >
            Never wonder{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>
              &ldquo;what were we doing last time?&rdquo;
            </em>{' '}
            again.
          </h1>

          <div
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--ink-3)',
              maxWidth: 480,
              marginBottom: 40,
              textWrap: 'pretty',
            }}
          >
            Strummy keeps every student&apos;s repertoire, lesson history, and progress in one place
            — so you walk into each lesson already knowing exactly where to pick up.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 32,
              flexWrap: 'wrap',
            }}
          >
            <CtaLink href="/sign-up" size="lg">
              Start free
              <ArrowRight />
            </CtaLink>
            <CtaLink href="#how-it-works" variant="ghost" size="lg">
              <PlayGlyph />
              See how it works
            </CtaLink>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: 'var(--ink-4)',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex' }}>
              {SAMPLE_STUDENTS.slice(0, 4).map((s, i) => (
                <span
                  key={s.avatar}
                  style={{
                    display: 'inline-flex',
                    borderRadius: '50%',
                    border: '2px solid var(--ivory)',
                    marginLeft: i === 0 ? 0 : -8,
                  }}
                >
                  <SampleAvatar s={s} size={26} />
                </span>
              ))}
            </div>
            <span>
              Built by a working guitar teacher —{' '}
              <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
                used in his studio every day
              </span>
            </span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: '-80px -40px',
              background: 'radial-gradient(50% 55% at 55% 45%, var(--gold-tint), transparent 70%)',
              opacity: 0.9,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <BrowserFrame url="strummy.vercel.app/dashboard" height={420}>
              <HeroDashboard />
            </BrowserFrame>
          </div>

          <HeroFloatChord />
          <HeroFloatActivity />
        </div>
      </div>
    </div>
  </div>
);
