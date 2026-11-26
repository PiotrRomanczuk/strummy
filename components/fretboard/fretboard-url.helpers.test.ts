import { keepLangParam } from './fretboard-url.helpers';

describe('keepLangParam', () => {
  it('appends the current ?lang= to the new query string', () => {
    expect(keepLangParam('?key=A&mode=scale', '?lang=pl&key=C')).toBe('?key=A&mode=scale&lang=pl');
  });

  it('leaves the query string alone when there is no ?lang=', () => {
    expect(keepLangParam('?key=A&mode=scale', '?key=C')).toBe('?key=A&mode=scale');
  });
});
