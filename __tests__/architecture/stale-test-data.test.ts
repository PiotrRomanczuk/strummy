import {
  STALE_AFTER_MS,
  TEST_TITLE_PREFIX,
  isStale,
  isTestAccountEmail,
} from '../../tests/helpers/stale-test-data';

/**
 * The stale sweep deletes rows by pattern on the shared dev stack. These cases
 * pin what it may and may not touch: a too-broad pattern deletes real seed
 * data, a too-narrow one lets fixtures pile up (3 080 songs by 2026-10-21).
 */
describe('stale test-data sweep patterns', () => {
  it.each([
    'E2E Quick Assign Song 1786823299532',
    'Copy of E2E Duplicate Source 1786823299532',
    'Panel Test 1786823299532',
    'Category Tab Test 1786823299532',
    'Row Expand Test 1786823299532',
  ])('treats the song "%s" as test data', (title) => {
    expect(TEST_TITLE_PREFIX.songs.test(title)).toBe(true);
  });

  it.each(['Wonderwall', 'E2E', 'Panel Test', 'Test Drive', 'RLS fixture song'])(
    'leaves the song "%s" alone',
    (title) => {
      expect(TEST_TITLE_PREFIX.songs.test(title)).toBe(false);
    }
  );

  it('matches E2E-prefixed lessons and assignments only', () => {
    expect(TEST_TITLE_PREFIX.lessons.test('E2E Flow Lesson 1786 weekly')).toBe(true);
    expect(TEST_TITLE_PREFIX.lessons.test('Barre chords')).toBe(false);
    expect(TEST_TITLE_PREFIX.assignments.test('E2E Flow Assignment 1786 overdue')).toBe(true);
    expect(TEST_TITLE_PREFIX.assignments.test('Work on transitions')).toBe(false);
  });

  it.each([
    ['newuser-123@example.com', true],
    ['pr1-student@example.test', true],
    ['e2e-shadow-1@noreply-test.invalid', true],
    ['student@dev.local', false],
    ['teacher@dev.local', false],
    ['e2e-flow-f11-teacher-mv48yv86@dev.local', true],
    ['e2e.flow.1792441798509@dev.local', true],
    ['flow.teacher.1792441798509@dev.local', true],
    ['debug-onb-1785692947680@dev.local', true],
    ['wa-test-kuba@dev.local', false],
    ['zosia@strummy.app', false],
    ['rls-teacher-a@guitarcrm.local', false],
    ['p.romanczuk@gmail.com', false],
    [null, false],
  ])('account %s → %s', (email, expected) => {
    expect(isTestAccountEmail(email)).toBe(expected);
  });

  it('only calls a row stale after the cut-off, so a concurrent run keeps its data', () => {
    const now = Date.parse('2026-10-21T12:00:00Z');
    expect(isStale(new Date(now - STALE_AFTER_MS - 1).toISOString(), now)).toBe(true);
    expect(isStale(new Date(now - 60_000).toISOString(), now)).toBe(false);
  });
});
