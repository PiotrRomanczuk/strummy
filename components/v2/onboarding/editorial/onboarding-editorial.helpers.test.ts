/**
 * Unit tests: editorial onboarding pure helpers.
 *
 * @see components/v2/onboarding/editorial/onboarding-editorial.helpers.ts
 */
import { DEFAULT_STUDENT, DEFAULT_TEACHER } from './onboarding-editorial.constants';
import {
  canAdvanceFrom,
  estimateSecondsLeft,
  parseInviteEmails,
  studioInitials,
} from './onboarding-editorial.helpers';

describe('studioInitials', () => {
  it('takes the first + last initial of a multi-word name', () => {
    expect(studioInitials('Sarah Chen Guitar Studio')).toBe('SS');
  });

  it('takes the first two letters of a single word', () => {
    expect(studioInitials('Riffs')).toBe('RI');
  });

  it('falls back to "ST" for an empty name', () => {
    expect(studioInitials('   ')).toBe('ST');
  });
});

describe('estimateSecondsLeft', () => {
  it('estimates ~60s per remaining step', () => {
    expect(estimateSecondsLeft(5, 1)).toBe(240);
  });

  it('never drops below 1s on the final step', () => {
    expect(estimateSecondsLeft(3, 3)).toBe(1);
  });
});

describe('parseInviteEmails', () => {
  it('splits on newlines, commas, and semicolons and trims blanks', () => {
    expect(parseInviteEmails('a@x.com\n b@x.com , c@x.com; ')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseInviteEmails('   ')).toEqual([]);
  });
});

describe('canAdvanceFrom', () => {
  it('blocks the role step until a role is chosen', () => {
    expect(canAdvanceFrom('role', null, DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(false);
    expect(canAdvanceFrom('role', 'student', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(true);
  });

  it('requires at least one goal on the student journey step', () => {
    expect(canAdvanceFrom('journey', 'student', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(false);
    expect(
      canAdvanceFrom(
        'journey',
        'student',
        { ...DEFAULT_STUDENT, goals: ['classics'] },
        DEFAULT_TEACHER
      )
    ).toBe(true);
  });

  it('requires a name on the teacher about step', () => {
    expect(canAdvanceFrom('about', 'teacher', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(false);
    expect(
      canAdvanceFrom('about', 'teacher', DEFAULT_STUDENT, {
        ...DEFAULT_TEACHER,
        displayName: 'Sarah',
      })
    ).toBe(true);
  });

  it('requires a studio name on the teacher studio step', () => {
    expect(canAdvanceFrom('studio', 'teacher', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(false);
    expect(
      canAdvanceFrom('studio', 'teacher', DEFAULT_STUDENT, {
        ...DEFAULT_TEACHER,
        studioName: 'Sarah Chen Studio',
      })
    ).toBe(true);
  });

  it('always allows advancing past skippable invite/schedule steps', () => {
    expect(canAdvanceFrom('invite', 'teacher', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(true);
    expect(canAdvanceFrom('schedule', 'teacher', DEFAULT_STUDENT, DEFAULT_TEACHER)).toBe(true);
  });
});
