import { translateAuthMessage } from './auth-messages.helpers';

const t = (key: string, values?: Record<string, number>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe('translateAuthMessage', () => {
  it.each([
    ['Valid email required', 'emailInvalid'],
    ['Password must be at least 8 characters', 'passwordMin8'],
    ["Passwords don't match", 'passwordsDontMatch'],
    [
      'Invalid email or password. If you haven\'t set a password yet, please use "Forgot password?" to create one.',
      'errorInvalidCredentials',
    ],
    [
      'Please confirm your email before signing in — check your inbox (and spam) for the confirmation link.',
      'errorEmailNotConfirmed',
    ],
  ])('maps "%s" to %s', (message, key) => {
    expect(translateAuthMessage(t, message)).toBe(key);
  });

  // These two strings are built in app/auth/actions.ts; if the wording there
  // changes, the user silently falls back to English — this test is the tripwire.
  it('carries the minutes through rate-limit and lockout messages', () => {
    expect(
      translateAuthMessage(t, 'Too many login attempts. Please try again in 15 minutes.')
    ).toBe('errorRateLimited:{"minutes":15}');
    expect(
      translateAuthMessage(
        t,
        'Account temporarily locked due to too many failed attempts. Try again in 1 minute.'
      )
    ).toBe('errorLocked:{"minutes":1}');
  });

  it('passes an unknown message through untouched', () => {
    expect(translateAuthMessage(t, 'Some GoTrue error')).toBe('Some GoTrue error');
  });
});
