import { openableHref } from './external-link.helpers';

describe('openableHref', () => {
  it('returns the URL for absolute http(s) links', () => {
    expect(openableHref('https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-27596')).toBe(
      'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-27596'
    );
    expect(openableHref('http://example.com/tab')).toBe('http://example.com/tab');
  });

  it('tolerates surrounding whitespace from a paste', () => {
    expect(openableHref('  https://open.spotify.com/track/abc  ')).toBe(
      'https://open.spotify.com/track/abc'
    );
  });

  it('returns undefined for an empty or whitespace-only field', () => {
    expect(openableHref('')).toBeUndefined();
    expect(openableHref('   ')).toBeUndefined();
  });

  it('returns undefined while the user is still typing a URL', () => {
    expect(openableHref('tabs.ultimate-guitar')).toBeUndefined();
    expect(openableHref('http')).toBeUndefined();
    expect(openableHref('https://')).toBeUndefined();
  });

  it('refuses non-http schemes so no unsafe href is ever rendered', () => {
    expect(openableHref('javascript:alert(1)')).toBeUndefined();
    expect(openableHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(openableHref('file:///etc/passwd')).toBeUndefined();
  });

  it('refuses relative paths', () => {
    expect(openableHref('/dashboard/songs')).toBeUndefined();
    expect(openableHref('../tab')).toBeUndefined();
  });
});
