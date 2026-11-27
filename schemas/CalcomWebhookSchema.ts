import * as z from 'zod';

/**
 * Attendee e-mail from a Cal.com webhook payload. The payload is untrusted
 * input: the address is used to look up profiles and is stored as
 * `invite_email`, so anything that is not a plain address (commas, brackets,
 * whitespace — the characters that change a PostgREST filter) is rejected.
 */
export const CalcomEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** Returns the normalised address, or null when it is not a valid e-mail. */
export function parseCalcomEmail(raw: unknown): string | null {
  const parsed = CalcomEmailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** A Cal.com booking uid, stored in `lessons.calcom_booking_id`. */
const CalcomUidSchema = z.string().trim().min(1).max(255);

const CalcomDateTimeSchema = z.iso.datetime({ offset: true });

/** BOOKING_CANCELLED: `uid` is the cancelled booking. */
export const CalcomCancelPayloadSchema = z.object({ uid: CalcomUidSchema });

/**
 * BOOKING_RESCHEDULED: Cal.com makes a new booking. `uid` is the new booking,
 * `rescheduleUid` the one it replaces, `startTime`/`endTime` the new slot
 * (docs.cal.com, developing/guides/automation/webhooks).
 */
export const CalcomReschedulePayloadSchema = z.object({
  uid: CalcomUidSchema,
  rescheduleUid: CalcomUidSchema,
  startTime: CalcomDateTimeSchema,
  endTime: CalcomDateTimeSchema.optional(),
});

export type CalcomReschedulePayload = z.infer<typeof CalcomReschedulePayloadSchema>;

/** `CALCOM_TEACHER_PROFILE_ID`: the profile every Cal.com lesson is booked with. */
export const CalcomTeacherProfileIdSchema = z.uuid();
