/**
 * Types for the editorial onboarding wizard
 * (components/v2/onboarding/editorial/*). Kept separate from the legacy
 * `types/onboarding.ts` so the old mobile flow is untouched.
 */

export type OnboardingRole = 'student' | 'teacher';

/** Four-way self-assessment shown in the student "guitar journey" step. */
export type EditorialSkillLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

/** Student answers — persisted to user_preferences. */
export interface StudentJourneyData {
  skillLevel: EditorialSkillLevel;
  goals: string[];
  dailyGoalMinutes: number;
}

/**
 * Teacher answers — persisted to teacher_settings (studio identity) plus the
 * profile role flags. `inviteEmails` is UI-only for now (see report gap).
 * `yearsExperience` is kept as a string for the controlled input; parsed on
 * submit.
 */
export interface TeacherStudioData {
  displayName: string;
  instrument: string;
  yearsExperience: string;
  studioName: string;
  tagline: string;
  city: string;
  timezone: string;
  teaches: string[];
  defaultLessonMinutes: number;
  inviteEmails: string;
}

/** Payload the client sends to the save action once the wizard completes. */
export interface OnboardingSavePayload {
  role: OnboardingRole;
  student?: StudentJourneyData;
  teacher?: TeacherStudioData;
}

/** Result shape returned by the save action. */
export type OnboardingSaveResult = { ok: true } | { error: string };
