/**
 * Maps the English messages the auth layer produces — Zod issues from
 * `schemas/AuthSchema.ts` and the errors `app/auth/actions.ts` returns — to
 * `Auth.*` message keys, so the forms can show them in the viewer's language
 * without changing the action contract every caller and test depends on.
 *
 * Anything unrecognised (a raw GoTrue message, say) passes through as-is:
 * an English sentence is better than a blank alert.
 */

type Translate = (key: string, values?: Record<string, number>) => string;

const EXACT: Record<string, string> = {
  'Valid email required': 'emailInvalid',
  'Invalid email': 'emailInvalid',
  'Password is required': 'passwordRequired',
  'Password must be at least 8 characters': 'passwordMin8',
  'Password must contain at least one letter': 'passwordLetter',
  'Password must contain at least one number': 'passwordNumber',
  "Passwords don't match": 'passwordsDontMatch',
  'Please confirm your password': 'confirmPasswordRequired',
  'Invalid email or password. If you haven\'t set a password yet, please use "Forgot password?" to create one.':
    'errorInvalidCredentials',
  'Please confirm your email before signing in — check your inbox (and spam) for the confirmation link.':
    'errorEmailNotConfirmed',
  'An unexpected error occurred': 'errorUnexpected',
};

const WITH_MINUTES: [RegExp, string][] = [
  [/^Too many \w+ attempts\. Please try again in (\d+) minutes?\.$/, 'errorRateLimited'],
  [/^Account temporarily locked .* Try again in (\d+) minutes?\.$/, 'errorLocked'],
];

export function translateAuthMessage(t: Translate, message: string): string {
  const key = EXACT[message];
  if (key) return t(key);
  for (const [pattern, minutesKey] of WITH_MINUTES) {
    const match = pattern.exec(message);
    if (match) return t(minutesKey, { minutes: Number(match[1]) });
  }
  return message;
}
