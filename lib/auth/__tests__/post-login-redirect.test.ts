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
  ])('falls back to /dashboard for %s', (_label, raw) => {
    expect(postLoginPath(raw)).toBe('/dashboard');
  });
});
