import { DEFAULT_LOCALE, isAppLocale, resolveLocaleFromAcceptLanguage } from '@/i18n/locales';

describe('resolveLocaleFromAcceptLanguage', () => {
  it('picks Polish from a Polish browser header', () => {
    expect(resolveLocaleFromAcceptLanguage('pl-PL,pl;q=0.9,en-US;q=0.8')).toBe('pl');
  });

  it('picks Polish from a bare region-less tag', () => {
    expect(resolveLocaleFromAcceptLanguage('pl')).toBe('pl');
  });

  it('honours order rather than matching on the string prefix', () => {
    // The previous implementation only checked whether the header *started*
    // with "pl", so an English-first header that merely listed Polish later
    // resolved to English — and, worse, a Polish-second header stayed English
    // for a user who does read Polish. Order is what the browser is telling us.
    expect(resolveLocaleFromAcceptLanguage('en-GB,en;q=0.9,pl;q=0.7')).toBe('en');
    expect(resolveLocaleFromAcceptLanguage('cs-CZ,cs;q=0.9,pl;q=0.8')).toBe('pl');
  });

  it('falls back to the default for unsupported and missing headers', () => {
    expect(resolveLocaleFromAcceptLanguage('de-DE,de;q=0.9')).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleFromAcceptLanguage('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleFromAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('ignores malformed segments instead of throwing', () => {
    expect(resolveLocaleFromAcceptLanguage(',,;q=0.9,pl')).toBe('pl');
  });
});

describe('isAppLocale', () => {
  it('accepts only the shipped locales', () => {
    expect(isAppLocale('pl')).toBe(true);
    expect(isAppLocale('en')).toBe(true);
    expect(isAppLocale('de')).toBe(false);
    expect(isAppLocale('')).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
  });
});
