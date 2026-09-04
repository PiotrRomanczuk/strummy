/**
 * The fretboard is a public, indexed page in two languages, so a missing or
 * drifted translation is user-visible, not cosmetic. These tests are the gate:
 * every scale and chord in the data layer must have a name and a description
 * in every locale, and the English ones must still match `lib/music-theory`
 * so the two never quietly disagree.
 */

import { createTranslator } from 'next-intl';

import { CHORD_DEFINITIONS, SCALE_DEFINITIONS } from '@/lib/music-theory';
import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

import {
  chordDescription,
  chordName,
  scaleDescription,
  scaleName,
  type Translate,
} from './fretboard.i18n';

const LOCALES = { en: enMessages, pl: plMessages } as const;

const translatorFor = (locale: keyof typeof LOCALES) =>
  createTranslator({ locale, messages: LOCALES[locale], namespace: 'Fretboard' });

describe.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])('%s messages', (locale) => {
  const t = translatorFor(locale);

  it.each(Object.keys(SCALE_DEFINITIONS))('names and describes the %s scale', (scaleKey) => {
    expect(scaleName(t, scaleKey)).toBeTruthy();
    expect(scaleDescription(t, scaleKey).length).toBeGreaterThan(10);
  });

  it.each(Object.keys(CHORD_DEFINITIONS))('names and describes the %s chord', (chordKey) => {
    expect(chordName(t, chordKey)).toBeTruthy();
    expect(chordDescription(t, chordKey).length).toBeGreaterThan(10);
  });

  it('covers every UI string the board needs', () => {
    const messages = LOCALES[locale].Fretboard as Record<string, unknown>;
    for (const key of [
      'railEyebrow',
      'railTitle',
      'eyebrow',
      'boardLabel',
      'mode',
      'key',
      'scale',
      'chord',
      'caged',
      'display',
      'playback',
      'quiz',
      'style',
      'board',
      'subhead',
      'info',
      'diatonic',
      'share',
    ]) {
      expect(messages[key]).toBeDefined();
    }
  });
});

describe('English stays in step with the data layer', () => {
  const t = translatorFor('en');

  it.each(Object.entries(SCALE_DEFINITIONS))('scale %s', (scaleKey, definition) => {
    expect(scaleName(t, scaleKey)).toBe(definition.name);
    expect(scaleDescription(t, scaleKey)).toBe(definition.description);
  });

  it.each(Object.entries(CHORD_DEFINITIONS))('chord %s', (chordKey, definition) => {
    expect(chordName(t, chordKey)).toBe(definition.name);
    expect(chordDescription(t, chordKey)).toBe(definition.description);
  });
});

describe('Polish is a real translation, not a copy', () => {
  const pl = translatorFor('pl');
  const en = translatorFor('en');

  it('translates the scales a beginner actually opens', () => {
    expect(scaleName(pl, 'pentatonic_minor')).toBe('Pentatonika molowa');
    expect(scaleName(pl, 'major')).toBe('Durowa (jońska)');
    expect(chordName(pl, 'minor')).toBe('Molowy');
  });

  it('differs from English almost everywhere', () => {
    const scales = Object.keys(SCALE_DEFINITIONS);
    const shared = scales.filter((key) => scaleName(pl, key) === scaleName(en, key));
    // "Blues" and the like can legitimately be the same word; most cannot.
    expect(shared.length).toBeLessThan(scales.length / 2);
  });
});

describe('fallbacks', () => {
  // A translator that reports every key as missing — what a half-updated
  // locale file would look like at runtime.
  const empty: Translate = Object.assign(
    (key: string) => {
      throw new Error(`should not be called for ${key}`);
    },
    { has: () => false }
  );

  it('falls back to the English name in the data layer', () => {
    expect(scaleName(empty, 'blues')).toBe(SCALE_DEFINITIONS.blues.name);
    expect(chordDescription(empty, 'minor')).toBe(CHORD_DEFINITIONS.minor.description);
  });

  it('degrades to the raw key for something it has never heard of', () => {
    expect(scaleName(empty, 'klingon_mode')).toBe('klingon_mode');
    expect(chordName(empty, 'klingon_chord')).toBe('klingon_chord');
  });
});
