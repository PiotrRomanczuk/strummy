import { postLoginPath } from '../post-login-redirect';

describe('postLoginPath', () => {
  it.each([
    ['/dashboard/lessons/abc', '/dashboard/lessons/abc'],
    ['/dashboard/assignments?selected=1', '/dashboard/assignments?selected=1'],
    ['/dashboard', '/dashboard'],
  ])('keeps the dashboard deep link %s', (raw, expected) => {
    expect(postLoginPath(raw)).toBe(expected);
  });

  it.each([
    ['missing', null],
    ['empty', ''],
    ['absolute URL', 'https://evil.com/dashboard'],
    ['protocol-relative', '//evil.com/dashboard'],
    ['backslash trick', '/\\evil.com'],
    ['outside the dashboard', '/sign-out'],
    ['dashboard-prefixed sibling', '/dashboardevil'],
    ['path traversal out', '/dashboard/../admin'],
    ['userinfo-style host', '@evil.com'],
  ])('falls back to /dashboard for %s', (_label, raw) => {
    expect(postLoginPath(raw)).toBe('/dashboard');
  });

  it('honours an exact extra path the caller allows', () => {
    expect(postLoginPath('/reset-password', ['/reset-password'])).toBe('/reset-password');
  });

  it.each([
    ['a path not in the list', '/reset-password', []],
    ['a traversal out of an allowed path', '/reset-password/../sign-out', ['/reset-password']],
    ['an allowed path on another host', '//evil.com/reset-password', ['/reset-password']],
  ])('still falls back for %s', (_label, raw, extra) => {
    expect(postLoginPath(raw, extra)).toBe('/dashboard');
  });
});
