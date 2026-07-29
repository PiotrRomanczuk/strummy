/**
 * Types for the onboarding wizard
 * (components/v2/onboarding/*). Kept separate from the legacy
 * `types/onboarding.ts` so the old mobile flow is untouched.
 */

export type OnboardingRole = 'student' | 'teacher';

/** Four-way self-assessment shown in the student "guitar journey" step. */
export type SkillLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

/** Student answers — persisted to user_preferences. */
export interface StudentJourneyData {
  skillLevel: SkillLevel;
  goals: string[];
  dailyGoalMinutes: number;
  /**
   * Instruments the player actually has to hand, persisted to
   * `user_preferences.instrument_preference`. Optional by design — a complete
   * beginner may not own one yet, and blocking the wizard on it would cost
   * completions for an answer the teacher can fill in at the first lesson.
   */
  guitars: string[];
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
  /**
   * Instruments the teacher plays, persisted to the same
   * `user_preferences.instrument_preference` column as a student's. Distinct
   * from `teaches` (which styles they take students for) and from
   * `instrument` (their single primary, a free-text field).
   */
  guitars: string[];
}

/** Payload the client sends to the save action once the wizard completes. */
export interface OnboardingSavePayload {
  role: OnboardingRole;
  student?: StudentJourneyData;
  teacher?: TeacherStudioData;
}

/** Result shape returned by the save action. */
export type OnboardingSaveResult = { ok: true } | { error: string };
