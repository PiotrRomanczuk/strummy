'use client';

import type { OnboardingWizard } from './useOnboarding';
import { StepAbout } from './steps/StepAbout';
import { StepDone } from './steps/StepDone';
import { StepInvite } from './steps/StepInvite';
import { StepJourney } from './steps/StepJourney';
import { StepRole } from './steps/StepRole';
import { StepSchedule } from './steps/StepSchedule';
import { StepStudio } from './steps/StepStudio';

type Props = {
  wizard: OnboardingWizard;
  stepKey: string;
  firstName?: string;
};

/** Maps the active step key to its step component. */
export const OnboardingSteps = ({ wizard, stepKey, firstName }: Props) => {
  // Each step used to hardcode its own "Step 2 of 5" eyebrow. The teacher path
  // has six steps, and the left rail counts them from the same array the wizard
  // walks — so the two disagreed on screen for the whole flow ("STEP 2 OF 5"
  // beside "Step 2 of 6"). Deriving it here means the count cannot drift again
  // when a step is added or removed.
  const eyebrow = `Step ${wizard.step + 1} of ${wizard.steps.length}`;

  switch (stepKey) {
    case 'role':
      return <StepRole role={wizard.role} onSelect={wizard.selectRole} />;
    case 'journey':
      return (
        <StepJourney
          student={wizard.student}
          onSetLevel={(level) => wizard.setStudent('skillLevel', level)}
          onToggleGoal={wizard.toggleGoal}
          onToggleGuitar={wizard.toggleStudentGuitar}
          onSetTarget={(minutes) => wizard.setStudent('dailyGoalMinutes', minutes)}
        />
      );
    case 'about':
      return (
        <StepAbout eyebrow={eyebrow}
          teacher={wizard.teacher}
          onChange={wizard.setTeacher}
          onToggleGuitar={wizard.toggleTeacherGuitar}
        />
      );
    case 'studio':
      return (
        <StepStudio eyebrow={eyebrow}
          teacher={wizard.teacher}
          onChange={wizard.setTeacher}
          onToggleTeaches={wizard.toggleTeaches}
        />
      );
    case 'invite':
      return <StepInvite eyebrow={eyebrow} teacher={wizard.teacher} onChange={wizard.setTeacher} />;
    case 'schedule':
      return <StepSchedule eyebrow={eyebrow} />;
    case 'done':
      return <StepDone role={wizard.role} firstName={firstName} />;
    default:
      return null;
  }
};
