import { listParam, pageHref } from './lab.helpers';

describe('pageHref with list params', () => {
  it('repeats list values and keeps the page', () => {
    expect(pageHref('/x', { has: ['a', 'b'], page: 2 })).toBe('/x?has=a&has=b&page=2');
  });

  it('drops an empty list and page 1', () => {
    expect(pageHref('/x', { has: [], page: 1 })).toBe('/x');
  });
});

describe('listParam', () => {
  it('returns [] for undefined', () => {
    expect(listParam(undefined)).toEqual([]);
  });

  it('wraps a single value', () => {
    expect(listParam('a')).toEqual(['a']);
  });

  it('drops empty entries', () => {
    expect(listParam(['a', ''])).toEqual(['a']);
  });
});
