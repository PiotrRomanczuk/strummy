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

/** Maps the active step key to its editorial step component. */
export const OnboardingSteps = ({ wizard, stepKey, firstName }: Props) => {
  switch (stepKey) {
    case 'role':
      return <StepRole role={wizard.role} onSelect={wizard.selectRole} />;
    case 'journey':
      return (
        <StepJourney
          student={wizard.student}
          onSetLevel={(level) => wizard.setStudent('skillLevel', level)}
          onToggleGoal={wizard.toggleGoal}
          onSetTarget={(minutes) => wizard.setStudent('dailyGoalMinutes', minutes)}
        />
      );
    case 'about':
      return <StepAbout teacher={wizard.teacher} onChange={wizard.setTeacher} />;
    case 'studio':
      return (
        <StepStudio
          teacher={wizard.teacher}
          onChange={wizard.setTeacher}
          onToggleTeaches={wizard.toggleTeaches}
        />
      );
    case 'invite':
      return <StepInvite teacher={wizard.teacher} onChange={wizard.setTeacher} />;
    case 'schedule':
      return <StepSchedule />;
    case 'done':
      return <StepDone role={wizard.role} firstName={firstName} />;
    default:
      return null;
  }
};
