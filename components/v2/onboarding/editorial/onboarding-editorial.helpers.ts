import type {
  OnboardingRole,
  StudentJourneyData,
  TeacherStudioData,
} from '@/types/onboarding-editorial';

/** Initials for the studio avatar chip, from the studio (or owner) name. */
export const studioInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/** Rough "time left" estimate for the rail footer (≈1 min per remaining step). */
export const estimateSecondsLeft = (total: number, current: number): number =>
  Math.max(1, (total - current) * 60);

/** Split a freeform email blob (newline / comma / semicolon separated). */
export const parseInviteEmails = (raw: string): string[] =>
  raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Whether the wizard may advance past the given step. Role must be chosen;
 * the student journey needs at least one goal; the teacher must name
 * themselves and their studio. Invite/schedule are always skippable.
 */
export const canAdvanceFrom = (
  stepKey: string,
  role: OnboardingRole | null,
  student: StudentJourneyData,
  teacher: TeacherStudioData
): boolean => {
  switch (stepKey) {
    case 'role':
      return role !== null;
    case 'journey':
      return student.goals.length > 0;
    case 'about':
      return teacher.displayName.trim().length > 0;
    case 'studio':
      return teacher.studioName.trim().length > 0;
    default:
      return true;
  }
};
