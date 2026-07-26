'use client';

import { OnboardingNavBar } from './Onboarding.NavBar';
import { OnboardingRail } from './Onboarding.Rail';
import { OnboardingSteps } from './Onboarding.Steps';
import { useOnboarding } from './useOnboarding';

type Props = { firstName?: string };

/**
 * Editorial onboarding wizard shell: a two-pane card (step rail + content).
 * The teacher branch adds studio setup with a live preview; the student branch
 * captures level, goals, and a daily practice target. Persistence and the step
 * machinery live in useOnboarding.
 */
export const Onboarding = ({ firstName }: Props) => {
  const wizard = useOnboarding();
  const { steps, step, role } = wizard;
  const stepKey = steps[step]?.key ?? 'role';
  const isDone = stepKey === 'done';
  const nextLabel = steps[step + 1]?.key === 'done' ? 'Finish setup' : 'Continue';

  return (
    <div className="ui-onb-page">
      <div className="ui-onb-shell">
        <OnboardingRail steps={steps} current={step} role={role} />

        <div className="ui-onb-content">
          <OnboardingSteps wizard={wizard} stepKey={stepKey} firstName={firstName} />

          {!isDone && (
            <OnboardingNavBar
              onBack={step > 0 ? wizard.back : undefined}
              onNext={wizard.next}
              nextLabel={nextLabel}
              canNext={wizard.canNext}
              isSaving={wizard.isSaving}
              error={wizard.error}
            />
          )}
        </div>
      </div>
    </div>
  );
};
