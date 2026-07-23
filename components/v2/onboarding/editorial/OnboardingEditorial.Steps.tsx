'use client';

import type { OnboardingWizard } from './useOnboardingEditorial';
import { StepAboutEditorial } from './steps/StepAboutEditorial';
import { StepDoneEditorial } from './steps/StepDoneEditorial';
import { StepInviteEditorial } from './steps/StepInviteEditorial';
import { StepJourneyEditorial } from './steps/StepJourneyEditorial';
import { StepRoleEditorial } from './steps/StepRoleEditorial';
import { StepScheduleEditorial } from './steps/StepScheduleEditorial';
import { StepStudioEditorial } from './steps/StepStudioEditorial';

type Props = {
  wizard: OnboardingWizard;
  stepKey: string;
  firstName?: string;
};

/** Maps the active step key to its editorial step component. */
export const OnboardingSteps = ({ wizard, stepKey, firstName }: Props) => {
  switch (stepKey) {
    case 'role':
      return <StepRoleEditorial role={wizard.role} onSelect={wizard.selectRole} />;
    case 'journey':
      return (
        <StepJourneyEditorial
          student={wizard.student}
          onSetLevel={(level) => wizard.setStudent('skillLevel', level)}
          onToggleGoal={wizard.toggleGoal}
          onSetTarget={(minutes) => wizard.setStudent('dailyGoalMinutes', minutes)}
        />
      );
    case 'about':
      return <StepAboutEditorial teacher={wizard.teacher} onChange={wizard.setTeacher} />;
    case 'studio':
      return (
        <StepStudioEditorial
          teacher={wizard.teacher}
          onChange={wizard.setTeacher}
          onToggleTeaches={wizard.toggleTeaches}
        />
      );
    case 'invite':
      return <StepInviteEditorial teacher={wizard.teacher} onChange={wizard.setTeacher} />;
    case 'schedule':
      return <StepScheduleEditorial />;
    case 'done':
      return <StepDoneEditorial role={wizard.role} firstName={firstName} />;
    default:
      return null;
  }
};
