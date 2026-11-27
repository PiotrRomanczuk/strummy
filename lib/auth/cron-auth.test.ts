/**
 * @jest-environment node
 */
import { verifyCronSecret } from './cron-auth';
import { secretsMatch } from './secret-compare';

jest.mock('./secret-compare', () => ({
  secretsMatch: jest.fn(jest.requireActual('./secret-compare').secretsMatch),
}));

const SECRET = 'cron-test-secret';

function requestWith(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/daily-report', { headers });
}

describe('verifyCronSecret', () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    (secretsMatch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env.CRON_SECRET = original;
  });

  it('accepts the configured bearer, compared in constant time', () => {
    expect(verifyCronSecret(requestWith(`Bearer ${SECRET}`))).toBeNull();
    expect(secretsMatch).toHaveBeenCalledWith(`Bearer ${SECRET}`, `Bearer ${SECRET}`);
  });

  it.each([
    ['missing header', undefined],
    ['wrong secret', 'Bearer cron-test-secreT'],
    ['longer value', `Bearer ${SECRET}x`],
    ['no Bearer prefix', SECRET],
  ])('returns 401 for %s', (_label, header) => {
    expect(verifyCronSecret(requestWith(header))?.status).toBe(401);
  });

  it('returns 500 when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronSecret(requestWith(`Bearer ${SECRET}`))?.status).toBe(500);
    expect(secretsMatch).not.toHaveBeenCalled();
  });
});
