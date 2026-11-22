import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

import type { IntakeAnswers } from './calcom-intake.helpers';

const log = createLogger('calcom');

type AdminClient = ReturnType<typeof createAdminClient>;

/** The student's age from the booking form, kept as a teacher-visible note. */
export function intakeNoteText(age: number | null): string | null {
  return age ? `Wiek ucznia (z formularza rezerwacji Cal.com): ${age}` : null;
}

/**
 * A profile whose real or invited address is `email`. Two exact lookups rather
 * than one `.or()` filter: the address comes from the webhook body, and
 * interpolated into a PostgREST filter a `,` or `)` in it would change which
 * rows match.
 */
export async function findProfileByEmail(
  admin: AdminClient,
  email: string
): Promise<{ id: string; is_parent: boolean | null } | null> {
  for (const column of ['email', 'invite_email'] as const) {
    const { data } = await admin
      .from('profiles')
      .select('id, is_parent')
      .eq(column, email)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

/** The parent who booked: an existing profile with that address, or a new placeholder (shadow). */
export async function resolveParentProfile(
  admin: AdminClient,
  email: string,
  name: string,
  phone: string | undefined
): Promise<string> {
  const existing = await findProfileByEmail(admin, email);
  if (existing) {
    if (!existing.is_parent) {
      const { error } = await admin
        .from('profiles')
        .update({ is_parent: true })
        .eq('id', existing.id);
      if (error) {
        log.warn('Could not mark profile as parent for Cal.com booking', {
          error: error.message,
        });
      }
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

const normalise = (name: string | null) => (name ?? '').trim().toLocaleLowerCase('pl');

/** The name a child gets when the booking did not say it. */
export const placeholderChildName = (parentName: string) => `Dziecko ${parentName}`.trim();

/**
 * Which child of this parent the lesson is for.
 *
 * - With the child's name from the form: the child of that name, or a new one.
 *   A single child still carrying the placeholder name from an earlier booking
 *   is that child — it gets its real name instead of a duplicate.
 * - Without a name: the only child, or — when there are several and nothing
 *   says which — the placeholder child for the teacher to sort out (reused if
 *   it already exists, created once otherwise), rather than booking a
 *   sibling's lesson onto the wrong child.
 */
export async function resolveChildProfile(
  admin: AdminClient,
  parentId: string,
  parentName: string,
  intake: IntakeAnswers
): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('parent_id', parentId)
    .eq('is_student', true);
  const children = (data ?? []) as Array<{ id: string; full_name: string | null }>;
  const placeholder = placeholderChildName(parentName);

  if (intake.childName) {
    const match = children.find((c) => normalise(c.full_name) === normalise(intake.childName));
    if (match) return match.id;
    const only = children.length === 1 ? children[0] : null;
    if (only && normalise(only.full_name) === normalise(placeholder)) {
      const { error } = await admin
        .from('profiles')
        .update({ full_name: intake.childName })
        .eq('id', only.id);
      if (error) log.error('Could not rename placeholder child for Cal.com booking:', error);
      return only.id;
    }
    return createChild(admin, parentId, intake.childName, intake);
  }

  if (children.length === 1) return children[0].id;
  if (children.length > 1) {
    const existingPlaceholder = children.find(
      (c) => normalise(c.full_name) === normalise(placeholder)
    );
    if (existingPlaceholder) return existingPlaceholder.id;
    log.warn('Cal.com booking for one of several children without a child name', { parentId });
  }
  return createChild(admin, parentId, placeholder, intake);
}

async function createChild(
  admin: AdminClient,
  parentId: string,
  fullName: string,
  intake: IntakeAnswers
): Promise<string> {
  const { data: created, error } = await admin
    .from('profiles')
    .insert({
      full_name: fullName,
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
