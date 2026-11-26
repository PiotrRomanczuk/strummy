import { createTranslator } from 'next-intl';

import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

import {
  INSTRUMENT_KEYS,
  LEVEL_KEYS,
  formatLessonWhen,
  labelFor,
  relativeDaysLabel,
} from './student-labels.helpers';

const NOW = new Date('2026-11-24T12:00:00Z');

const translator = (locale: 'en' | 'pl') =>
  createTranslator({
    locale,
    messages: locale === 'en' ? enMessages : plMessages,
    namespace: 'Users',
  });

describe('labelFor', () => {
  const t = translator('pl') as unknown as (key: string) => string;

  it('translates a stored instrument and level', () => {
    expect(labelFor(INSTRUMENT_KEYS, 'Guitar', t)).toBe('Gitara');
    expect(labelFor(LEVEL_KEYS, 'beginner', t)).toBe('Początkujący');
    expect(labelFor(LEVEL_KEYS, 'Beginner', t)).toBe('Początkujący');
  });

  it('shows an unknown value as stored', () => {
    expect(labelFor(INSTRUMENT_KEYS, 'lap-steel', t)).toBe('lap-steel');
  });
});

describe('relativeDaysLabel', () => {
  it('says "dzisiaj" / "3 dni temu" in Polish and "today" / "3 days ago" in English', () => {
    expect(relativeDaysLabel('2026-11-24T08:00:00Z', 'pl', NOW)).toBe('dzisiaj');
    expect(relativeDaysLabel('2026-11-21T08:00:00Z', 'pl', NOW)).toBe('3 dni temu');
    expect(relativeDaysLabel('2026-11-24T08:00:00Z', 'en', NOW)).toBe('today');
    expect(relativeDaysLabel('2026-11-21T08:00:00Z', 'en', NOW)).toBe('3 days ago');
  });
});

describe('formatLessonWhen', () => {
  it('follows the viewer locale: 24 h clock and Polish month in pl, AM/PM in en', () => {
    const iso = '2026-11-27T16:00:00Z';
    expect(formatLessonWhen(iso, 'en')).toMatch(/Nov 27 · \d{1,2}:00\s?(AM|PM)$/);
    const pl = formatLessonWhen(iso, 'pl');
    expect(pl).toMatch(/27/);
    expect(pl).toMatch(/lis/);
    expect(pl).not.toMatch(/AM|PM/);
  });
});

describe('Users plural messages', () => {
  it('uses the Polish plural forms for the day units and the banner', () => {
    const t = translator('pl');
    expect(t('detailTileDays', { count: 1 })).toBe('dzień');
    expect(t('detailTileDays', { count: 5 })).toBe('dni');
    expect(t('detailTileDaysAgo', { count: 1 })).toBe('dzień temu');
    expect(t('detailBannerNoPractice', { days: 1 })).toBe('Nie zapisał ćwiczeń od 1 dnia.');
    expect(t('detailBannerNoPractice', { days: 20 })).toBe('Nie zapisał ćwiczeń od 20 dni.');
  });

  it('keeps English singular and plural', () => {
    const t = translator('en');
    expect(t('detailTileDays', { count: 1 })).toBe('day');
    expect(t('detailTileDays', { count: 3 })).toBe('days');
  });
});
