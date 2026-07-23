'use client';

import { OnboardingNavBar } from './OnboardingEditorial.NavBar';
import { OnboardingRail } from './OnboardingEditorial.Rail';
import { OnboardingSteps } from './OnboardingEditorial.Steps';
import { useOnboardingEditorial } from './useOnboardingEditorial';

type Props = { firstName?: string };

/**
 * Editorial onboarding wizard shell: a two-pane card (step rail + content).
 * The teacher branch adds studio setup with a live preview; the student branch
 * captures level, goals, and a daily practice target. Persistence and the step
 * machinery live in useOnboardingEditorial.
 */
export const OnboardingEditorial = ({ firstName }: Props) => {
  const wizard = useOnboardingEditorial();
  const { steps, step, role } = wizard;
  const stepKey = steps[step]?.key ?? 'role';
  const isDone = stepKey === 'done';
  const nextLabel = steps[step + 1]?.key === 'done' ? 'Finish setup' : 'Continue';

  return (
    <div className="ed-onb-page">
      <div className="ed-onb-shell">
        <OnboardingRail steps={steps} current={step} role={role} />

        <div className="ed-onb-content">
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
