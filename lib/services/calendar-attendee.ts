import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { createShadowStudent } from '@/lib/services/import-utils';

/**
 * Which student a Google Calendar event is a lesson for (#1097).
 *
 * One answer for every import path — the Google webhook, the daily cron and
 * the bulk import — so a lesson booked by a parent lands on the child, never on
 * the parent's profile or on a new "student" made from the parent's address
 * (lessons count against the lesson-credit balance since #1028).
 *
 *   1. an attendee whose profile is a student → that student;
 *   2. otherwise an attendee who is a parent → their only child;
 *   3. otherwise one attendee nobody knows → a new shadow student;
 *   4. anything else is left for the teacher to assign by hand.
 */

type Admin = SupabaseClient<Database>;

/** An attendee as the Google Calendar API returns it. */
export type CalendarAttendee = {
  email?: string | null;
  displayName?: string | null;
  self?: boolean | null;
  resource?: boolean | null;
};

/** Why an event was left for the teacher to assign by hand. */
export type ManualReason =
  | 'no_attendee'
  | 'several_students'
  | 'parent_without_child'
  | 'parent_with_several_children'
  | 'several_unknown'
  | 'not_a_student'
  | 'lookup_failed';

export type LessonStudent =
  | { ok: true; studentId: string; via: 'student' | 'parent' | 'created' }
  | { ok: false; reason: ManualReason; error?: string };

export const MANUAL_REASON_TEXT: Record<ManualReason, string> = {
  no_attendee: 'No attendee other than the teacher',
  several_students: 'Several students attend — assign the lesson by hand',
  parent_without_child: 'A parent attends but has no linked child',
  parent_with_several_children: 'A parent with several children attends — assign by hand',
  several_unknown: 'Several unknown attendees — assign the lesson by hand',
  not_a_student: 'The attendee is not a student or a parent',
  lookup_failed: 'Could not look up the attendee',
};

type Guest = { email: string; displayName: string };
type Profile = { id: string; is_student: boolean; is_parent: boolean };

/** Attendees other than the teacher and meeting rooms, one per address. */
export function lessonGuests(
  attendees: CalendarAttendee[] | null | undefined,
  teacherEmail: string
): Guest[] {
  const teacher = teacherEmail.trim().toLowerCase();
  const guests = new Map<string, string>();
  for (const attendee of attendees ?? []) {
    const email = attendee.email?.trim().toLowerCase();
    if (!email || attendee.self || attendee.resource || email === teacher) continue;
    if (guests.has(email)) continue;
    guests.set(email, (attendee.displayName ?? '').replace(/\$\$\$\s*/g, '').trim());
  }
  return [...guests].map(([email, displayName]) => ({ email, displayName }));
}

// profiles.email is citext, so `in` already ignores case; invite_email is text
// and the guests' addresses are lower-cased above.
async function profilesFor(admin: Admin, emails: string[]): Promise<Profile[]> {
  const lookups = await Promise.all(
    (['email', 'invite_email'] as const).map((column) =>
      admin.from('profiles').select('id, is_student, is_parent').in(column, emails)
    )
  );
  const failed = lookups.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  const byId = new Map<string, Profile>();
  for (const profile of lookups.flatMap((result) => result.data ?? [])) {
    byId.set(profile.id, profile);
  }
  return [...byId.values()];
}

async function childrenOf(admin: Admin, parentIds: string[]): Promise<string[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .in('parent_id', parentIds)
    .eq('is_student', true)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((child) => child.id))];
}

async function fromProfiles(admin: Admin, profiles: Profile[]): Promise<LessonStudent> {
  const students = profiles.filter((profile) => profile.is_student);
  if (students.length === 1) return { ok: true, studentId: students[0].id, via: 'student' };
  if (students.length > 1) return { ok: false, reason: 'several_students' };

  const parents = profiles.filter((profile) => profile.is_parent);
  if (parents.length === 0) return { ok: false, reason: 'not_a_student' };
  // Both parents may attend; they count once when they share the child.
  const children = await childrenOf(
    admin,
    parents.map((parent) => parent.id)
  );
  if (children.length === 1) return { ok: true, studentId: children[0], via: 'parent' };
  return {
    ok: false,
    reason: children.length === 0 ? 'parent_without_child' : 'parent_with_several_children',
  };
}

async function createStudent(admin: Admin, guest: Guest): Promise<LessonStudent> {
  const [firstName, ...rest] = (guest.displayName || guest.email.split('@')[0]).split(' ');
  const created = await createShadowStudent(guest.email, firstName, rest.join(' '), admin);
  if (!created.success || !created.profileId) {
    return { ok: false, reason: 'lookup_failed', error: created.error };
  }
  return { ok: true, studentId: created.profileId, via: 'created' };
}

/** Resolve (or create) the student a calendar event is a lesson for. */
export async function resolveLessonStudent(
  attendees: CalendarAttendee[] | null | undefined,
  teacherEmail: string,
  admin: Admin
): Promise<LessonStudent> {
  const guests = lessonGuests(attendees, teacherEmail);
  if (guests.length === 0) return { ok: false, reason: 'no_attendee' };

  try {
    const profiles = await profilesFor(
      admin,
      guests.map((guest) => guest.email)
    );
    if (profiles.length > 0) return await fromProfiles(admin, profiles);
    // Unknown parent + unknown child: a new "student" from the parent's
    // address is exactly the mistake this module exists to prevent.
    if (guests.length > 1) return { ok: false, reason: 'several_unknown' };
    return await createStudent(admin, guests[0]);
  } catch (error) {
    return {
      ok: false,
      reason: 'lookup_failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
