import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import type { CalcomAttendee, CalcomBookingPayload } from './calcom';

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

  return {
    isForChild: value('student_or_child') === 'Swoje dziecko',
    age,
    hasOwnInstrument,
    skillLevel,
  };
}

function intakeNoteText(age: number | null): string | null {
  return age ? `Wiek ucznia (z formularza rezerwacji Cal.com): ${age}` : null;
}

async function resolveParentProfile(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  name: string,
  phone: string | undefined
): Promise<string> {
  const { data: existing } = await admin
    .from('profiles')
    .select('id, is_parent')
    .or(`email.eq.${email},invite_email.eq.${email}`)
    .maybeSingle();

  if (existing) {
    if (!existing.is_parent) {
      await admin.from('profiles').update({ is_parent: true }).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await admin
    .from('profiles')
    .insert({
      full_name: name,
      invite_email: email,
      phone: phone ?? null,
      is_shadow: true,
      is_parent: true,
    })
    .select('id')
    .single();

  if (error || !created) {
    log.error('Error creating parent profile for Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not create parent profile');
  }
  return created.id;
}

async function resolveChildProfile(
  admin: ReturnType<typeof createAdminClient>,
  parentId: string,
  parentName: string,
  intake: IntakeAnswers
): Promise<string> {
  const { data: existingChild } = await admin
    .from('profiles')
    .select('id')
    .eq('parent_id', parentId)
    .eq('is_student', true)
    .maybeSingle();

  if (existingChild) return existingChild.id;

  const { data: created, error } = await admin
    .from('profiles')
    .insert({
      full_name: `Dziecko ${parentName}`.trim(),
      parent_id: parentId,
      is_shadow: true,
      is_student: true,
      student_status: 'active',
      skill_level: intake.skillLevel,
      has_own_instrument: intake.hasOwnInstrument,
      notes: intakeNoteText(intake.age),
    })
    .select('id')
    .single();

  if (error || !created) {
    log.error('Error creating child profile for Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not create child profile');
  }
  return created.id;
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

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .or(`email.eq.${email},invite_email.eq.${email}`)
    .maybeSingle();

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
