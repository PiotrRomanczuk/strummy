import { centsToPlnInput, formatPln, packagePriceCents, parsePlnToCents } from '../package-price';

describe('packagePriceCents', () => {
  it('uses the list price when the student has no rate', () => {
    expect(packagePriceCents({ lessonRate: null, lessonCount: 4, priceCents: 48000 })).toBe(48000);
    expect(packagePriceCents({ lessonRate: 0, lessonCount: 4, priceCents: 48000 })).toBe(48000);
  });

  it("uses the student's rate times the number of lessons when set", () => {
    expect(packagePriceCents({ lessonRate: 100, lessonCount: 8, priceCents: 90000 })).toBe(80000);
  });

  it('stays exact for rates with grosze', () => {
    expect(packagePriceCents({ lessonRate: 119.99, lessonCount: 3, priceCents: 1 })).toBe(35997);
  });
});

describe('parsePlnToCents', () => {
  it.each([
    ['480', 48000],
    ['480,5', 48050],
    ['480.50', 48050],
    ['1 200,00 zł', 120000],
    ['0', 0],
  ])('reads %s', (text, cents) => {
    expect(parsePlnToCents(text)).toBe(cents);
  });

  it.each(['', 'abc', '-5', '12,345', '4e3', '1.2.3'])('refuses %p', (text) => {
    expect(parsePlnToCents(text)).toBeNull();
  });
});

describe('centsToPlnInput', () => {
  it('round-trips through the parser', () => {
    for (const cents of [0, 5, 48000, 48050, 119999]) {
      expect(parsePlnToCents(centsToPlnInput(cents))).toBe(cents);
    }
    expect(centsToPlnInput(48000)).toBe('480');
    expect(centsToPlnInput(48005)).toBe('480,05');
  });
});

describe('formatPln', () => {
  it('formats grosze as złoty', () => {
    expect(formatPln(48050, 'pl').replace(/\s/g, ' ')).toBe('480,50 zł');
  });
});
