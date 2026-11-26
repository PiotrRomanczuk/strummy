/**
 * Left rail of the onboarding wizard: brand mark, headline, step tracker with
 * connectors, and a "time left" footer. Presentational.
 */
import { useTranslations } from 'next-intl';

import { PickMark } from '@/components/shared/BrandMark';
import type { OnboardingRole } from '@/types/onboarding';
import type { WizardStep } from './onboarding.constants';
import { estimateSecondsLeft } from './onboarding.helpers';

const roleLabelKey = (role: OnboardingRole | null) =>
  role === 'teacher' ? 'railRoleTeacher' : role === 'student' ? 'railRoleStudent' : 'railRoleNone';

/** The last step reads differently per path, so `done` has two message keys. */
const stepMessageKey = (key: string, role: OnboardingRole | null): string =>
  key === 'done' ? (role === 'teacher' ? 'doneTeacher' : 'doneStudent') : key;

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
}) => {
  const t = useTranslations('Onboarding');
  return (
    <div className="ui-onb-rail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.15)',
          }}
        >
          <PickMark size={18} stroke="#fff" />
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
            {t(roleLabelKey(role))}
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
          marginBottom: 8,
        }}
      >
        {t.rich('railTitle', {
          em: (chunks) => <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{chunks}</em>,
        })}
      </div>
      <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        {t(role === 'student' ? 'railSubStudent' : 'railSubTeacher')}
      </p>

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
                  {t(`steps.${stepMessageKey(s.key, role)}.title`)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                  {t(`steps.${stepMessageKey(s.key, role)}.sub`)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginTop: 16 }}
      >
        {t('railProgress', {
          current: current + 1,
          total: steps.length,
          seconds: estimateSecondsLeft(steps.length, current),
        })}
      </div>
    </div>
  );
};
