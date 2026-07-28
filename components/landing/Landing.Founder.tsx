import Image from 'next/image';
import { Display, LandingContainer, SectionKicker } from './Landing.primitives';

/** Founder story — portrait + first-person quote. */
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
              borderRadius: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Image
              src="/landing/founder.jpg"
              alt="Piotr, Strummy's founder, playing acoustic guitar in a park"
              fill
              sizes="(max-width: 900px) 100vw, 480px"
              style={{ objectFit: 'cover' }}
            />
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
