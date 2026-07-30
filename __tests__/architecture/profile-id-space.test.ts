import fs from 'node:fs';
import path from 'node:path';

/**
 * RATCHET — an auth user id is not a profile id.
 *
 * The identity model (migration 20260727110000, "S2"): `profiles.id` is an
 * independent PK, `profiles.user_id` is the auth linkage, and every domain FK
 * — `lessons.teacher_id`, `assignments.student_id`, … — lives in PROFILE-id
 * space. For accounts created before S2 the two ids happen to be equal, which
 * is exactly why `.eq('teacher_id', user.id)` looks correct and passes review:
 * it works for every existing account and returns ZERO ROWS for every new one.
 *
 * Mocked tests cannot see this. The Supabase mock resolves whatever filter it
 * is handed, so all ~3,700 unit tests pass either way; the real-database proof
 * lives in `lib/testing/rls/__tests__/divergent-identity.rls.test.ts`, which
 * covers the DB policy layer. This test covers the other half — application
 * query sites — statically, because there is no cheap way to execute them all.
 *
 * KNOWN BLIND SPOT: this only sees the auth id used INLINE in the filter. It
 * cannot follow indirection — `getStudentRepertoireAction(user.id)` in a page,
 * with `.eq('student_id', studentId)` in the action, is the same bug and does
 * not match. That exact shape shipped and left every post-S2 student with an
 * empty repertoire and lesson list until 2026-07-29. Prefer passing
 * `profileId` from `getUserWithRolesSSR()`, which exists so the correct value
 * is also the convenient one.
 *
 * The baseline below is a RATCHET, not an allowlist of approved code: every
 * entry is a known bug awaiting the S2 sweep. Counts may only go DOWN. Adding
 * a new occurrence fails the build; fixing one and forgetting to update the
 * baseline also fails, so the number cannot drift upward silently.
 */

const ROOTS = ['app', 'lib', 'components'] as const;

/** Columns that hold a profiles.id — comparing them to an auth uid is the bug. */
const PROFILE_ID_COLUMNS = ['teacher_id', 'student_id', 'profile_id', 'created_by'] as const;

const OFFENDING_CALL = new RegExp(
  `\\.eq\\(\\s*['"](?:${PROFILE_ID_COLUMNS.join('|')})['"]\\s*,\\s*(?:auth)?[uU]ser\\.id\\s*\\)`,
  'g'
);

/**
 * The INSERT form of the same bug: `teacher_id: user.id` inside an object
 * literal. Previously invisible here, which is how the CSV importer shipped
 * writing lessons with an auth id — every insert was rejected by the
 * `lessons_insert_teacher` policy, which checks the row against
 * current_profile_id(). Filtering silently returns nothing; inserting fails
 * loudly, so this one at least surfaced as an error to the user.
 */
const OFFENDING_INSERT = new RegExp(
  `\\b(?:${PROFILE_ID_COLUMNS.join('|')})\\s*:\\s*(?:auth)?[uU]ser\\.id\\b`,
  'g'
);

/**
 * Known offenders, to be drained by the S2 identity sweep.
 *
 * 2026-07-30: detection widened to the INSERT form (`teacher_id: user.id`),
 * which took the recorded count from 19 across 8 files to 32 across 17. Those
 * 13 were always broken — they were simply invisible to a filter-only regex.
 * Drained the same day: app/api/users/route.ts (empty teacher roster) and
 * app/actions/import-csv-songs.ts (every lesson insert rejected by RLS).
 * Drained so far: app/api/users/route.ts (2026-07-30) — the teacher roster
 * query, which made the People page show an empty roster for every teacher.
 * Every one of these returns no rows for any account created after S2.
 */
const BASELINE: Record<string, number> = {
  'app/actions/assignment-templates.ts': 2,
  'app/actions/chord-quiz.ts': 1,
  'app/actions/chord-srs.ts': 4,
  'app/actions/song-of-the-week.ts': 1,
  'app/actions/song-requests.ts': 2,
  'app/api/calendar-sync/route.ts': 2,
  'app/api/calendar/sync/stream/route.ts': 1,
  'app/api/dashboard/stats/route.ts': 7,
  'app/api/lessons/analytics/route.ts': 2,
  'app/api/lessons/schedule/route.ts': 1,
  'app/api/lessons/search/route.ts': 2,
  'app/api/lessons/templates/route.ts': 1,
  'app/api/teacher/lessons/route.ts': 1,
  'app/dashboard/lessons/actions.ts': 1,
  'app/dashboard/lessons/previous-songs-action.ts': 1,
  'app/dashboard/lessons/recurring-actions.ts': 2,
  'app/dashboard/theory/actions.ts': 1,
};

const IGNORED_SEGMENTS = ['node_modules', '__tests__', '.next'];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_SEGMENTS.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function countOffenders(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    if (!fs.existsSync(abs)) continue;
    for (const file of sourceFiles(abs)) {
      const src = fs.readFileSync(file, 'utf8');
      const matches = [...(src.match(OFFENDING_CALL) ?? []), ...(src.match(OFFENDING_INSERT) ?? [])];
      if (matches.length) {
        counts[path.relative(process.cwd(), file).split(path.sep).join('/')] = matches.length;
      }
    }
  }
  return counts;
}

const FIX_HINT =
  "Resolve the caller's PROFILE id first (loadAuthedProfile / current_profile_id) " +
  'and filter on that — `user.id` is an auth uid and matches nothing post-S2.';

describe('profile-id space (auth uid is not a profile id)', () => {
  const actual = countOffenders();

  // Jest's `expect` takes no message argument, so each assertion compares a
  // report string against '' — a failure then prints the offenders and the fix.
  it('introduces no NEW file comparing a profile-id column to an auth uid', () => {
    const newFiles = Object.keys(actual).filter((f) => !(f in BASELINE));
    const report = newFiles.length
      ? `New offender(s):\n  ${newFiles.join('\n  ')}\n\n${FIX_HINT}`
      : '';
    expect(report).toBe('');
  });

  it('never increases the count in a file that already has some', () => {
    const grown = Object.entries(actual)
      .filter(([file, count]) => file in BASELINE && count > BASELINE[file])
      .map(([file, count]) => `${file}: ${BASELINE[file]} → ${count}`);
    const report = grown.length
      ? `Offender count grew:\n  ${grown.join('\n  ')}\n\n${FIX_HINT}`
      : '';
    expect(report).toBe('');
  });

  it('keeps the baseline honest — fixed files must be removed from it', () => {
    const stale = Object.entries(BASELINE)
      .filter(([file, count]) => (actual[file] ?? 0) < count)
      .map(([file, count]) => `${file}: baseline ${count}, now ${actual[file] ?? 0}`);
    const report = stale.length
      ? `Fixed — lower or delete these BASELINE entries in ${path.basename(__filename)}:\n  ${stale.join('\n  ')}`
      : '';
    expect(report).toBe('');
  });
});
