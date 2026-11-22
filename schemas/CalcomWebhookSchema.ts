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
