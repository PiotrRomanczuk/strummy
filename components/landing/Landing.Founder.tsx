import { StaffLines } from './Landing.art';
import { Display, LandingContainer, SectionKicker } from './Landing.primitives';

/** Founder story — portrait placeholder + first-person quote. */
export const FounderStory = () => (
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
              background: `repeating-linear-gradient(135deg,
                var(--rule-2) 0px, var(--rule-2) 1px,
                transparent 1px, transparent 9px)`,
              backgroundColor: 'var(--card)',
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--rule)',
                background: 'var(--card)',
                borderRadius: 6,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  color: 'var(--gold-2)',
                  fontSize: 9,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                }}
              >
                Portrait
              </div>
              <div>founder.jpg</div>
            </div>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                transform: 'translateY(-50%)',
                opacity: 0.15,
              }}
            >
              <StaffLines height={100} color="var(--ink)" strokeWidth={0.7} />
            </div>
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
            Warsaw, PL · Est. 2024
          </div>
        </div>

        <div className="ui-land-feature-copy">
          <SectionKicker>Who made this</SectionKicker>
          <Display sizeClass="ui-land-display-44" style={{ marginBottom: 24 }}>
            Built by a guitar teacher who was{' '}
            <em style={{ color: 'var(--gold-2)' }}>tired of his own spreadsheets</em>.
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
            &ldquo;I teach guitar in Warsaw — twenty-odd students, mostly weekly lessons. For years
            the record of what each of them was working on lived in chat threads and my own memory.
            I built Strummy because I didn&apos;t want to reconstruct it every Thursday anymore.
            I&apos;m still teaching. I still use it every day.&rdquo;
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>Piotr</span> — founder, still
            teaching
          </div>
        </div>
      </div>
    </LandingContainer>
  </div>
);
