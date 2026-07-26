import { SAMPLE_STUDENTS } from './landing.data';
import { SampleAvatar } from './Landing.primitives';

/** Floating "next lesson" chord card, bottom-left of the hero shot. */
export const HeroFloatChord = () => (
  <div
    className="ed-land-float"
    style={{
      position: 'absolute',
      left: -52,
      bottom: -44,
      zIndex: 2,
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 14px 30px -10px rgba(26,22,19,.18)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}
  >
    <span
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 30,
        color: 'var(--ink-2)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        width: 44,
        height: 52,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      G
    </span>
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--ink-4)',
          letterSpacing: '.14em',
          textTransform: 'uppercase',
        }}
      >
        Today · 4:00p · Emma
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 16,
          fontStyle: 'italic',
          lineHeight: 1.1,
          marginTop: 3,
        }}
      >
        Blackbird
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
        Fingerpicking · 10 min
      </div>
    </div>
  </div>
);

/** Floating activity pill, top-right of the hero shot. */
export const HeroFloatActivity = () => (
  <div
    className="ed-land-float"
    style={{
      position: 'absolute',
      right: -24,
      top: -22,
      zIndex: 2,
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 999,
      padding: '7px 14px 7px 7px',
      boxShadow: '0 14px 30px -10px rgba(26,22,19,.18)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <SampleAvatar s={SAMPLE_STUDENTS[4]} size={24} />
    <div style={{ fontSize: 12, lineHeight: 1.25 }}>
      <span style={{ fontWeight: 500 }}>Maya</span>{' '}
      <span style={{ color: 'var(--success)', fontWeight: 500 }}>mastered</span>{' '}
      <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)' }}>Classical Gas</span>
    </div>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>22m</span>
  </div>
);
