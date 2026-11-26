import { isRecoverySession } from './recovery-session';

function token(claims: unknown): string {
  return `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
}

describe('isRecoverySession', () => {
  it('is true when the most recent method is recovery', () => {
    expect(isRecoverySession(token({ amr: [{ method: 'recovery', timestamp: 2 }] }))).toBe(true);
  });

  it('is false for any other method', () => {
    expect(isRecoverySession(token({ amr: [{ method: 'oauth', timestamp: 2 }] }))).toBe(false);
    expect(isRecoverySession(token({ amr: [{ method: 'otp', timestamp: 2 }] }))).toBe(false);
  });

  it('is false when recovery is not the most recent method', () => {
    const amr = [
      { method: 'password', timestamp: 3 },
      { method: 'recovery', timestamp: 1 },
    ];
    expect(isRecoverySession(token({ amr }))).toBe(false);
  });

  it('is false for a missing, malformed or amr-less token', () => {
    expect(isRecoverySession(undefined)).toBe(false);
    expect(isRecoverySession('')).toBe(false);
    expect(isRecoverySession('not-a-jwt')).toBe(false);
    expect(isRecoverySession('h.%%%.s')).toBe(false);
    expect(isRecoverySession(token({ sub: 'x' }))).toBe(false);
  });
});
