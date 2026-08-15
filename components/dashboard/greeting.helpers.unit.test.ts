import { greetingName } from './greeting.helpers';

describe('greetingName', () => {
  it('prefers the first token of the profile name', () => {
    expect(greetingName('Ola Wojciechowska', 'ola@example.com')).toBe('Ola');
  });

  it('handles a single-word name', () => {
    expect(greetingName('Quentin', 'q@example.com')).toBe('Quentin');
  });

  it('ignores a whitespace-only name', () => {
    expect(greetingName('   ', 'michal@example.com')).toBe('Michal');
  });

  // The regression: every invited account starts with null profile names, so
  // this path is what a new user actually reads on their first visit.
  it('never renders a raw address when the name is missing', () => {
    expect(greetingName(null, 'p.romanczuk+testteacher@gmail.com')).toBe('Romanczuk');
  });

  it('drops a +alias suffix rather than greeting someone by it', () => {
    expect(greetingName(null, 'anna+strummy@gmail.com')).toBe('Anna');
  });

  it('skips a bare initial in favour of the name-like token', () => {
    expect(greetingName(null, 'a.kowalski@example.com')).toBe('Kowalski');
  });

  it('falls back to a neutral address when nothing reads as a name', () => {
    expect(greetingName(null, '12345@example.com')).toBe('there');
    expect(greetingName(null, 'x@example.com')).toBe('there');
  });

  it('does not throw on a malformed address', () => {
    expect(greetingName(null, '')).toBe('there');
  });
});
