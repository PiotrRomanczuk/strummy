/**
 * How the dashboards address the signed-in person.
 *
 * Lived in two copies (TeacherGreeting + StudentDashboard) with identical
 * behaviour, and both fell back to `email.split('@')[0]` capitalized. Every
 * invited account starts with null profile names, so the very first thing a new
 * user read was "Good morning, P.romanczuk+testteacher." — and because the
 * greeting `<h1>` does not break long words, that unbroken 38-character string
 * widened the whole mobile dashboard to 486px and made the page scroll
 * sideways at 390px. One helper now, and it never emits a raw address.
 */

/** Neutral address for someone we have no usable name for. */
const ANONYMOUS = 'there';

/** Local parts split on these; `+alias` suffixes are dropped entirely. */
const HANDLE_SEPARATORS = /[._-]+/;

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Best name-like token in an email local part, or null when there isn't one.
 * `p.romanczuk+testteacher@…` → "Romanczuk": the `+alias` goes first, then the
 * bare initial, leaving the only token that reads as a name. A purely numeric
 * or single-letter handle yields null rather than something a person would not
 * recognise as themselves.
 */
const nameFromEmail = (email: string): string | null => {
  const localPart = email.split('@')[0]?.split('+')[0] ?? '';
  const token = localPart
    .split(HANDLE_SEPARATORS)
    .find((part) => part.length > 1 && /^[a-z]+$/i.test(part));
  return token ? capitalize(token) : null;
};

/**
 * What to call this person in a greeting: their first name when we have one,
 * a name-like fragment of their address when we don't, and "there" otherwise.
 */
export const greetingName = (fullName: string | null, email: string): string => {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  return nameFromEmail(email) ?? ANONYMOUS;
};
