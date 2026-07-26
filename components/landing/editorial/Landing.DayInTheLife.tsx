import { DAY_AFTER, DAY_BEFORE } from './landing.data';
import { Display, LandingContainer, SectionKicker } from './Landing.primitives';

type Row = { time: string; text: string };

const TimelineColumn = ({ rows, tone }: { rows: Row[]; tone: 'before' | 'after' }) => (
  <div
    style={{
      background: tone === 'after' ? 'var(--card)' : 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {tone === 'before' && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `repeating-linear-gradient(-45deg,
            transparent 0, transparent 9px,
            color-mix(in oklab, var(--ink-5) 25%, transparent) 9px,
            color-mix(in oklab, var(--ink-5) 25%, transparent) 10px)`,
          opacity: 0.25,
        }}
      />
    )}
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: tone === 'before' ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {tone === 'before' ? 'Before' : 'After'}
        </span>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 28,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {tone === 'before' ? 'Thursday, the hard way.' : 'Thursday, with Strummy.'}
        </span>
      </div>

      <div>
        {rows.map((r, i) => (
          <div
            key={r.time}
            style={{
              display: 'grid',
              gridTemplateColumns: '58px 14px 1fr',
              gap: 14,
              padding: '14px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: tone === 'before' ? 'var(--ink-4)' : 'var(--ink-2)',
                fontWeight: 500,
                paddingTop: 1,
              }}
            >
              {r.time}
            </div>
            <div style={{ position: 'relative', height: '100%' }}>
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  left: 5,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tone === 'before' ? 'var(--ink-5)' : 'var(--gold)',
                }}
              />
              {i !== rows.length - 1 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 17,
                    left: 7,
                    bottom: -14,
                    width: 1,
                    background: tone === 'before' ? 'var(--ink-5)' : 'var(--gold-dim)',
                    opacity: 0.6,
                  }}
                />
              )}
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.45,
                color: tone === 'before' ? 'var(--ink-3)' : 'var(--ink-2)',
                textWrap: 'pretty',
              }}
            >
              {r.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Problem → solution: the same Thursday, before and after Strummy. */
export const DayInTheLife = () => (
  <div
    id="for-teachers"
    style={{ padding: '100px 0', background: 'var(--ivory)', scrollMarginTop: 80 }}
  >
    <LandingContainer>
      <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 56px' }}>
        <SectionKicker align="center">A Thursday</SectionKicker>
        <Display sizeClass="ui-land-display-56" align="center" style={{ marginBottom: 18 }}>
          You didn&apos;t get into teaching to manage{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>spreadsheets</em>.
        </Display>
        <div
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--ink-3)',
            maxWidth: 620,
            margin: '0 auto',
          }}
        >
          Ask any working guitar teacher: hours every week disappear into admin nobody pays for.
          Here&apos;s what a normal day looks like.
        </div>
      </div>

      <div className="ui-land-cols-2">
        <TimelineColumn rows={DAY_BEFORE} tone="before" />
        <TimelineColumn rows={DAY_AFTER} tone="after" />
      </div>
    </LandingContainer>
  </div>
);
