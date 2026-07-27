import { SAMPLE_STUDENTS } from './landing.data';
import { FeatureShotPanels } from './Landing.FeatureShot.Panels';
import { BrowserFrame } from './Landing.frames';
import { HealthDot, SampleAvatar } from './Landing.primitives';

const CARD: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 10,
};

/** Static mock of the student-profile screen for feature row 01. */
export const FeatureShotStudent = () => {
  const s = SAMPLE_STUDENTS[0];
  return (
    <BrowserFrame url="strummy.vercel.app/dashboard/users" height={480}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'var(--ivory)',
          fontSize: 12,
          lineHeight: 1.4,
          overflow: 'hidden',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 48,
            flex: '0 0 48px',
            background: 'var(--paper)',
            borderRight: '1px solid var(--rule)',
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
            }}
          />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: i === 2 ? 'var(--rule)' : 'var(--rule-2)',
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Students · Intermediate
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <SampleAvatar s={s} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: '-0.02em' }}>
                {s.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 3,
                  color: 'var(--ink-3)',
                  fontSize: 12,
                  flexWrap: 'wrap',
                }}
              >
                <HealthDot health={s.health} /> Excellent
                <span>·</span>
                <span>2.3 years with you</span>
                <span>·</span>
                <span>Next: Today · 4:00p</span>
              </div>
            </div>
            <span
              style={{
                padding: '6px 12px',
                border: '1px solid var(--rule)',
                background: 'var(--card)',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              Message
            </span>
            <span
              style={{
                padding: '6px 12px',
                background: 'var(--ink)',
                color: 'var(--paper)',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              + Lesson
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              { l: 'Songs', v: '14', s: '5 mastered' },
              { l: 'Practice', v: '11', s: 'day streak' },
              { l: 'Lessons', v: '48', s: 'all time' },
              { l: 'Skill', v: '62', s: '% proficient' },
            ].map((st) => (
              <div key={st.l} style={{ ...CARD, padding: '10px 12px' }}>
                <div
                  style={{
                    color: 'var(--ink-4)',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                  }}
                >
                  {st.l}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginTop: 2,
                  }}
                >
                  {st.v}
                </div>
                <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>{st.s}</div>
              </div>
            ))}
          </div>

          <FeatureShotPanels />
        </div>
      </div>
    </BrowserFrame>
  );
};
