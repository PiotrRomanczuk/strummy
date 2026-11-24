import { strayAuthCodeRedirect } from './stray-auth-code';

const CODE = '5b1f0c7e-2d34-4c8a-9a51-0e6f3b7d1a22';

describe('strayAuthCodeRedirect', () => {
  it('forwards a code on the home page to the auth callback', () => {
    expect(strayAuthCodeRedirect('/', `?code=${CODE}`)).toBe(`/auth/callback?code=${CODE}`);
  });

  it('ignores other paths', () => {
    expect(strayAuthCodeRedirect('/pricing', `?code=${CODE}`)).toBeNull();
    expect(strayAuthCodeRedirect('/auth/callback', `?code=${CODE}`)).toBeNull();
  });

  it('ignores the home page without a code', () => {
    expect(strayAuthCodeRedirect('/', '')).toBeNull();
    expect(strayAuthCodeRedirect('/', '?lang=pl')).toBeNull();
  });

  it('ignores values that cannot be an auth code', () => {
    expect(strayAuthCodeRedirect('/', '?code=')).toBeNull();
    expect(strayAuthCodeRedirect('/', '?code=../../x')).toBeNull();
    expect(strayAuthCodeRedirect('/', '?code=PROMO10')).toBeNull();
  });
});
