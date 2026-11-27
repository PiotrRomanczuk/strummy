import { parseChord } from './chord-parser';
import { chordToRomanNumeral, degreeNumeral, tonicNumeral } from './roman-numeral';

const numeralOf = (chord: string, key: string) => {
  const parsed = parseChord(chord);
  if (!parsed) throw new Error(`not a chord: ${chord}`);
  return chordToRomanNumeral(parsed, key).numeral;
};

// Hotel California in B minor, as the theory card reads Strummy's chords and as song2logic wrote its map.
const HOTEL_CHORDS = ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em'];
const HOTEL_SONG2LOGIC = ['i', 'V', 'bVII', 'IV', 'bVI', 'bIII', 'iv'];
const HOTEL_APP = ['i', 'V', 'VII', 'IV', 'VI', 'III', 'iv'];

describe('one numeral convention (#1242)', () => {
  it('writes the same chord the same way on the theory card and on the map', () => {
    expect(HOTEL_CHORDS.map((chord) => numeralOf(chord, 'Bm'))).toEqual(HOTEL_APP);
    expect(HOTEL_SONG2LOGIC.map((n) => tonicNumeral(n, true))).toEqual(HOTEL_APP);
  });

  it('leaves a major key as song2logic wrote it', () => {
    const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'bVII', 'bIII', 'V7'];
    expect(numerals.map((n) => tonicNumeral(n, false))).toEqual(numerals);
  });

  it('marks only chords outside the minor scale', () => {
    expect(tonicNumeral('ii°', true)).toBe('ii°');
    expect(tonicNumeral('v', true)).toBe('v');
    expect(tonicNumeral('III', true)).toBe('#III'); // a major chord on the raised third
    expect(tonicNumeral('bII', true)).toBe('bII'); // the Neapolitan
    expect(tonicNumeral('VI', true)).toBe('#VI'); // the Dorian sixth
    expect(tonicNumeral('vii°', true)).toBe('#vii°'); // the leading tone
  });

  it('converts half bars chord by chord and keeps what is not a numeral', () => {
    expect(tonicNumeral('bVII IV', true)).toBe('VII IV');
    expect(tonicNumeral('bVI7 bIII', true)).toBe('VI7 III');
    expect(tonicNumeral('N', true)).toBe('N');
    expect(tonicNumeral('?', false)).toBe('?');
  });

  it('agrees with the chord path for every root in both modes', () => {
    const roots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const major = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
    roots.forEach((root, i) => {
      expect(tonicNumeral(major[i], true)).toBe(numeralOf(root, 'Cm'));
      expect(tonicNumeral(major[i], false)).toBe(numeralOf(root, 'C'));
    });
  });
});

describe('degreeNumeral', () => {
  it('counts from the tonic in the key`s own scale and wraps octaves', () => {
    expect(degreeNumeral(10, true, false)).toEqual({ index: 6, numeral: 'VII', isInScale: true });
    expect(degreeNumeral(10, false, false)).toEqual({
      index: 6,
      numeral: 'bVII',
      isInScale: false,
    });
    expect(degreeNumeral(-2, true, true).numeral).toBe('vii');
  });
});
