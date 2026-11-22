import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import type { CalcomAttendee, CalcomBookingPayload } from './calcom';
import {
  findProfileByEmail,
  intakeNoteText,
  resolveChildProfile,
  resolveParentProfile,
} from './calcom-family';

const log = createLogger('calcom');

/**
 * Maps the "Gitara-lekcja" event type's four skill-level answers onto
 * profiles.skill_level. Order matches components/onboarding/onboarding.constants.ts:
 * 'novice' means "a few months in", not "starting from zero" — that's 'beginner'.
 */
const SKILL_LEVEL_BY_ANSWER: Record<string, string> = {
  'Zaczynam od zera': 'beginner',
  Podstawowy: 'novice',
  Średniozaawansowany: 'intermediate',
  Zaawansowany: 'advanced',
};

export interface IntakeAnswers {
  isForChild: boolean;
  /** "Imię dziecka" (`child_name`) when the booking form asks for it; null otherwise. */
  childName: string | null;
  age: number | null;
  hasOwnInstrument: boolean | null;
  skillLevel: string | null;
}

export function extractIntakeAnswers(responses: CalcomBookingPayload['responses']): IntakeAnswers {
  const value = (identifier: string) => responses?.[identifier]?.value;

  const ageRaw = value('student_age');
  const age = typeof ageRaw === 'number' ? ageRaw : Number(ageRaw) || null;

  const instrumentAnswer = value('has_own_instrument');
  const hasOwnInstrument =
    instrumentAnswer === 'Tak' ? true : instrumentAnswer === 'Nie' ? false : null;

  const skillAnswer = value('guitar_skill_level');
  const skillLevel =
    typeof skillAnswer === 'string' ? (SKILL_LEVEL_BY_ANSWER[skillAnswer] ?? null) : null;

  const childNameAnswer = value('child_name');
  const childName =
    typeof childNameAnswer === 'string' && childNameAnswer.trim()
      ? childNameAnswer.trim().slice(0, 120)
      : null;

  return {
    isForChild: value('student_or_child') === 'Swoje dziecko',
    childName,
    age,
    hasOwnInstrument,
    skillLevel,
  };
}

export async function resolveStudentId(
  admin: ReturnType<typeof createAdminClient>,
  attendee: CalcomAttendee,
  email: string,
  intake: IntakeAnswers
): Promise<string> {
  if (intake.isForChild) {
    const parentId = await resolveParentProfile(admin, email, attendee.name, attendee.phoneNumber);
    return resolveChildProfile(admin, parentId, attendee.name, intake);
  }

  const existingProfile = await findProfileByEmail(admin, email);

  // Booking-form answers are unverified guesses about a real, already-known
  // person — never overwrite their existing profile with them.
  if (existingProfile) return existingProfile.id;

  const { data: created, error: createError } = await admin
    .from('profiles')
    .insert({
      full_name: attendee.name,
      invite_email: email,
      is_shadow: true,
      is_student: true,
      student_status: 'active',
      skill_level: intake.skillLevel,
      has_own_instrument: intake.hasOwnInstrument,
      notes: intakeNoteText(intake.age),
    })
    .select('id')
    .single();

  if (createError || !created) {
    log.error('Error creating shadow student for Cal.com booking:', createError);
    throw new Error('Cal.com webhook: could not create student profile');
  }
  return created.id;
}
