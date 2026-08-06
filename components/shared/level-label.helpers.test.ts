import { Constants } from '@/types/database.types';

import { LEVEL_LABEL_KEYS, SONG_LEVELS, THEORY_LEVELS, levelLabel } from './level-label.helpers';

/** Stands in for next-intl's `t` — echoes the key so assertions read plainly. */
const t = (key: string) => `t:${key}`;

describe('SONG_LEVELS', () => {
  it('runs lowest to highest, with starter below beginner', () => {
    expect(SONG_LEVELS).toEqual(['starter', 'beginner', 'intermediate', 'advanced']);
  });

  it('matches the difficulty_level Postgres enum, value for value and in order', () => {
    // The migration places 'starter' BEFORE 'beginner' so `ORDER BY level` needs
    // no CASE expression. Comparing against the generated constants means a
    // future enum change that skips this file fails here rather than silently
    // sorting the UI differently from the database.
    expect([...SONG_LEVELS]).toEqual([...Constants.public.Enums.difficulty_level]);
  });

  it('has a label key for every level', () => {
    for (const level of SONG_LEVELS) {
      expect(LEVEL_LABEL_KEYS[level]).toBeDefined();
    }
  });
});

describe('THEORY_LEVELS', () => {
  it('stays at three — theory uses a separate Postgres enum', () => {
    expect(THEORY_LEVELS).toEqual(['beginner', 'intermediate', 'advanced']);
  });

  it('does not offer starter, which theoretical_course_level would reject', () => {
    expect(THEORY_LEVELS).not.toContain('starter');
  });
});

describe('levelLabel', () => {
  it('resolves every song level through its message key', () => {
    expect(levelLabel('starter', t)).toBe('t:levelStarter');
    expect(levelLabel('beginner', t)).toBe('t:levelBeginner');
    expect(levelLabel('intermediate', t)).toBe('t:levelIntermediate');
    expect(levelLabel('advanced', t)).toBe('t:levelAdvanced');
  });

  it('returns an empty string for null or undefined', () => {
    expect(levelLabel(null, t)).toBe('');
    expect(levelLabel(undefined, t)).toBe('');
    expect(levelLabel('', t)).toBe('');
  });

  it('capitalises an unrecognised value rather than failing to translate', () => {
    expect(levelLabel('expert', t)).toBe('Expert');
  });
});
