/**
 * chord-shape: every field below is a real `songs.chords` value (2026-11),
 * because the column is typed by hand and the dialects are the whole problem.
 */

import { chordShape, chordShapes, englishChordName } from './chord-shape';

describe('englishChordName', () => {
  it.each([
    ['e', 'Em'],
    ['a7', 'Am7'],
    ['fis', 'F#m'],
    ['cis', 'C#m'],
    ['h', 'Bm'],
    ['H', 'B'],
    ['H7', 'B7'],
    ['Fis', 'F#'],
    ['Es', 'Eb'],
    ['e/A', 'Em/A'],
  ])('reads the Polish/lower-case name %s as %s', (token, expected) => {
    expect(englishChordName(token)).toBe(expected);
  });

  it.each(['G', 'Bb', 'Bm', 'Gsus4', 'Cadd9', 'D/F#', 'Fmaj7'])('leaves %s alone', (token) => {
    expect(englishChordName(token)).toBe(token);
  });
});

describe('chordShape', () => {
  it.each([
    ['Em7', 'Em'],
    ['G/B', 'G'],
    ['Dsus4', 'D'],
    ['Cadd9', 'C'],
    ['Fmaj7', 'F'],
    ['A5', 'A'],
    ['C11sus2', 'C'],
    ['Bm7', 'Bm'],
    ['G#m7', 'G#m'],
    ['Abm', 'G#m'],
    ['A#', 'Bb'],
    ['D#', 'Eb'],
    ['Gb', 'F#'],
    ['Bdim', 'Bdim'],
    ['F#m7b5', 'F#m'],
    ['Caug', 'C'],
    ['C+', 'C'],
    ['Am7/G', 'Am'],
    ['D6/9', 'D'],
  ])('folds %s into the %s shape', (token, expected) => {
    expect(chordShape(token)).toBe(expected);
  });

  it.each([
    'Various',
    'x',
    'każdy',
    '2',
    'Chorus',
    'Bridge',
    'Akustycznie',
    'e|-----0---|',
    'B|--0--|',
  ])('is null for %s', (token) => {
    expect(chordShape(token)).toBeNull();
  });
});

describe('chordShapes', () => {
  it.each([
    ['Am, G', ['Am', 'G']],
    ['Bm F# A', ['Bm', 'F#', 'A']],
    ['{G,e,b,C}', ['G', 'Em', 'Bm', 'C']],
    ['Em7 G Dsus4 A7sus4', ['Em', 'G', 'D', 'A']],
    ['D, G, Em, A, F#, Bm, C, C/B, Am, D/A', ['D', 'G', 'Em', 'A', 'F#', 'Bm', 'C', 'Am']],
    ['D G | D G/A | D A | F#m Bm | A G/D F#m e/A D', ['D', 'G', 'A', 'F#m', 'Bm', 'Em']],
    ['Intro: G9 F#7 E7 D9', ['G', 'F#', 'E', 'D']],
    ['Zwrotka: a d E x2 Refren: C G (x4 każdy)', ['Am', 'Dm', 'E', 'C', 'G']],
    ['Am, Am7, G, G7, F, F7, C, C7, E, E7', ['Am', 'G', 'F', 'C', 'E']],
    ['Am-G-F-E', ['Am', 'G', 'F', 'E']],
  ])('reads %s', (field, expected) => {
    expect(chordShapes(field)).toEqual(expected);
  });

  it.each([
    null,
    undefined,
    '',
    '   ',
    'Various',
    'Capo: no capo\ne|-----0---|\nB|--0------|',
    // A pasted tab on its own: every line starts with a note name.
    'e|-----0---|\nB|--0------|\nG|---------|\nD|---------|\nA|---------|\nE|---------|',
    // Section words with no colon start with A–G too.
    'Chorus Am G Bridge C',
  ])('is null for an unreadable field %p', (field) => {
    expect(chordShapes(field)).toBeNull();
  });

  it('is null when the field names more shapes than a chord list does', () => {
    expect(chordShapes('C D E F G A B Cm Dm Em Fm Gm')).toBeNull();
  });
});
