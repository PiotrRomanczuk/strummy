/**
 * @jest-environment node
 */
import * as crypto from 'node:crypto';
import { secretsMatch } from './secret-compare';

jest.mock('node:crypto', () => {
  const actual = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, timingSafeEqual: jest.fn(actual.timingSafeEqual) };
});

const timingSafeEqual = crypto.timingSafeEqual as jest.Mock;

describe('secretsMatch', () => {
  beforeEach(() => timingSafeEqual.mockClear());

  it('matches an identical secret through timingSafeEqual', () => {
    expect(secretsMatch('Bearer s3cret', 'Bearer s3cret')).toBe(true);
    expect(timingSafeEqual).toHaveBeenCalledTimes(1);
  });

  it('rejects a same-length secret that differs', () => {
    expect(secretsMatch('Bearer s3creT', 'Bearer s3cret')).toBe(false);
  });

  it('rejects a different length without calling timingSafeEqual (it would throw)', () => {
    expect(secretsMatch('Bearer s3cret-and-more', 'Bearer s3cret')).toBe(false);
    expect(secretsMatch('Bearer', 'Bearer s3cret')).toBe(false);
    expect(timingSafeEqual).not.toHaveBeenCalled();
  });

  it('compares bytes, not UTF-16 units', () => {
    // 'é' is one UTF-16 unit but two UTF-8 bytes: equal string length must not
    // be mistaken for equal buffer length.
    expect(secretsMatch('é', 'e')).toBe(false);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
  ])('never matches a %s value', (_label, provided) => {
    expect(secretsMatch(provided, 'expected')).toBe(false);
  });

  it('never matches when the expected secret is empty', () => {
    expect(secretsMatch('', '')).toBe(false);
  });
});
