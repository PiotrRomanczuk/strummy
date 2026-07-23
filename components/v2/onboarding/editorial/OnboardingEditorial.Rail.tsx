/**
 * Left rail of the onboarding wizard: brand mark, headline, step tracker with
 * connectors, and a "time left" footer. Presentational.
 */
import type { OnboardingRole } from '@/types/onboarding-editorial';
import type { WizardStep } from './onboarding-editorial.constants';
import { estimateSecondsLeft } from './onboarding-editorial.helpers';

const roleLabel = (role: OnboardingRole | null): string =>
  role === 'teacher' ? 'Teacher setup' : role === 'student' ? 'Student setup' : 'Getting started';

const StepDot = ({ done, active, index }: { done: boolean; active: boolean; index: number }) => (
  <div
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: done ? 'var(--gold-2)' : active ? 'var(--ink)' : 'var(--card)',
      border: done || active ? 'none' : '1.5px solid var(--rule)',
      color: done || active ? '#fff' : 'var(--ink-4)',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--mono)',
      fontSize: 11,
      fontWeight: 600,
      flex: '0 0 24px',
      zIndex: 1,
    }}
  >
    {done ? '✓' : index + 1}
  </div>
);

export const OnboardingRail = ({
  steps,
  current,
  role,
}: {
  steps: WizardStep[];
  current: number;
  role: OnboardingRole | null;
}) => (
  <div className="ed-onb-rail">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontFamily: 'var(--serif)',
          fontWeight: 600,
        }}
      >
        S
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500 }}>Strummy</div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {roleLabel(role)}
        </div>
      </div>
    </div>

    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 26,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        marginBottom: 24,
      }}
    >
      Let&apos;s get you <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>set up</em>.
    </div>

    <div style={{ flex: 1 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={s.key}
            style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}
          >
            {i < steps.length - 1 && (
              <span
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 34,
                  bottom: -10,
                  width: 2,
                  background: done ? 'var(--gold-2)' : 'var(--rule)',
                }}
              />
            )}
            <StepDot done={done} active={active} index={i} />
            <div style={{ paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--ink)' : done ? 'var(--ink-3)' : 'var(--ink-4)',
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>

    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginTop: 16 }}>
      Step {current + 1} of {steps.length} · ~{estimateSecondsLeft(steps.length, current)}s left
    </div>
  </div>
);
