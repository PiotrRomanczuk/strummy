import { getDiatonicChords, romanNumeralFor } from '../index';

describe('romanNumeralFor', () => {
  it('cases the numeral by chord quality', () => {
    expect(romanNumeralFor(0, '')).toBe('I');
    expect(romanNumeralFor(1, 'm')).toBe('ii');
    expect(romanNumeralFor(6, '°')).toBe('vii°');
    expect(romanNumeralFor(2, '+')).toBe('III+');
  });
});

describe('getDiatonicChords', () => {
  it('harmonises the major scale as I ii iii IV V vi vii°', () => {
    const chords = getDiatonicChords('C', 'major');
    expect(chords.map((c) => c.root)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });

  it('harmonises the natural minor scale as i ii° III iv v VI VII', () => {
    const chords = getDiatonicChords('A', 'natural_minor');
    expect(chords.map((c) => c.root)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(chords.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('raises the fifth in harmonic minor and the third in mixolydian', () => {
    expect(getDiatonicChords('A', 'harmonic_minor').map((c) => c.roman)).toEqual([
      'i',
      'ii°',
      'III+',
      'iv',
      'V',
      'VI',
      'vii°',
    ]);
    expect(getDiatonicChords('G', 'mixolydian').map((c) => c.roman)).toEqual([
      'I',
      'ii',
      'iii°',
      'IV',
      'v',
      'vi',
      'VII',
    ]);
  });

  it('returns nothing for scales without a seven-degree harmonisation', () => {
    expect(getDiatonicChords('A', 'pentatonic_minor')).toEqual([]);
    expect(getDiatonicChords('A', 'blues')).toEqual([]);
    expect(getDiatonicChords('A', 'chromatic')).toEqual([]);
    expect(getDiatonicChords('A', 'not_a_scale')).toEqual([]);
  });
});
