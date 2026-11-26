import { timingSafeEqual } from 'node:crypto';

/**
 * Compare a caller-supplied secret (bearer header, webhook token) with the
 * configured one in constant time. `===` stops at the first differing
 * character; `timingSafeEqual` does not, but it throws on buffers of unequal
 * length, so the length is checked first.
 *
 * An empty or missing value on either side never matches.
 */
export function secretsMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
