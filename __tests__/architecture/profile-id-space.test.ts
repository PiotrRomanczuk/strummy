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
 * The indirection blind spot this once had is now covered — see
 * OFFENDING_INDIRECT below. It went uncovered for one release too long: on
 * 2026-08-01 a production audit found `getStudentOptions(user.id, …)` and
 * `getAssignmentsList(user.id, …)` across ten pages, which emptied every
 * teacher-facing student picker, made the assignments list unable to return a
 * row for anyone, disabled both AI tools, and hid the Edit affordance on lesson
 * detail so lesson notes could not be written at all. Every one of those files
 * passed this test, because the offending `.eq()` lived one call deeper.
 *
 * Prefer passing `profileId` from `getUserWithRolesSSR()`, which exists so the
 * correct value is also the convenient one.
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
 * Handing an auth id to something whose NAME says profile id. This is the
 * indirection case the header warns about — `getUsersList({ userId: user.id })`
 * fed an auth id into a lessons.teacher_id filter one call deeper, and the
 * People page showed an empty roster while /api/users returned four students.
 * Mocked tests cannot catch it (the mock echoes whatever symbol it is given),
 * so naming is the defence and this keeps the naming honest.
 */
const OFFENDING_ALIAS = new RegExp(
  `\\b(?:profileId|teacherId|studentId)\\s*:\\s*(?:auth)?[uU]ser\\.id\\b`,
  'g'
);

/**
 * The JSX form of the alias bug: `<TemplateEdit teacherId={user.id} />`. Same
 * mistake, different punctuation — `=` rather than `:` — so the alias regex
 * above never saw it. Both assignment-template pages shipped this, writing an
 * auth id into `assignment_templates.teacher_id`, whose RLS WITH CHECK compares
 * it to current_profile_id(): rejected outright for a plain teacher, and for an
 * admin it wrote a row that nothing could ever read back.
 */
const OFFENDING_JSX_PROP = new RegExp(
  `\\b(?:profileId|teacherId|studentId)=\\{\\s*(?:auth)?[uU]ser\\.id\\s*\\}`,
  'g'
);

/**
 * Auth id handed to a function that filters a PROFILE-id column with it — the
 * indirection case. Two passes: derive the function names, then flag callers.
 *
 * A function qualifies when its FIRST parameter is used as the value of an
 * `.eq()` whose column expression mentions a profile-id column. That covers the
 * literal form (`.eq('teacher_id', userId)`) and the ternary form
 * (`.eq(asStudent ? 'student_id' : 'teacher_id', userId)`). First-parameter
 * only, deliberately: every real offender in this codebase takes the id first,
 * and widening to all positions bought false positives without finding more.
 *
 * Functions that resolve the column through a variable — `getRecentLessons`
 * does `.eq(ownerColumn, userId)` — cannot be derived this way and are listed
 * in EXTRA_PROFILE_ID_FUNCTIONS by hand.
 */
const EXTRA_PROFILE_ID_FUNCTIONS = [
  'getRecentLessons', // .eq(scopeColumn(viewer), userId)
  'getLessonsBreakdown', // same
] as const;

const DERIVE_PROFILE_ID_FN = new RegExp(
  `export\\s+(?:async\\s+)?function\\s+(\\w+)\\s*\\(\\s*(\\w+)\\s*:`,
  'g'
);

function profileIdFunctionNames(files: string[]): Set<string> {
  const names = new Set<string>(EXTRA_PROFILE_ID_FUNCTIONS);
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const [, fnName, firstParam] of src.matchAll(DERIVE_PROFILE_ID_FN)) {
      const usesParamOnProfileColumn = new RegExp(
        `\\.eq\\([^,)]*['"](?:${PROFILE_ID_COLUMNS.join('|')})['"][^,)]*,\\s*${firstParam}\\s*\\)`
      );
      if (usesParamOnProfileColumn.test(src)) names.add(fnName);
    }
  }
  return names;
}

const indirectCallPattern = (fnNames: Set<string>): RegExp | null =>
  fnNames.size
    ? new RegExp(`\\b(?:${[...fnNames].join('|')})\\(\\s*(?:auth)?[uU]ser\\??\\.id\\b`, 'g')
    : null;

/**
 * Known offenders, to be drained by the S2 identity sweep.
 *
 * 2026-07-30: detection widened to the INSERT form (`teacher_id: user.id`),
 * which took the recorded count from 19 across 8 files to 32 across 17. Those
 * 13 were always broken — they were simply invisible to a filter-only regex.
 * Drained the same day: app/api/users/route.ts (empty teacher roster) and
 * app/actions/import-csv-songs.ts (every lesson insert rejected by RLS).
 * Drained so far: app/api/users/route.ts (2026-07-30) — the teacher roster
 * query, which made the People page show an empty roster for every teacher —
 * and app/actions/assignment-templates.ts (2026-08-01), whose two inserts wrote
 * an auth id into a column the RLS WITH CHECK tests against current_profile_id().
 * Every one of these returns no rows for any account created after S2.
 */
const BASELINE: Record<string, number> = {};

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

function allSourceFiles(): string[] {
  const files: string[] = [];
  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    if (fs.existsSync(abs)) sourceFiles(abs, files);
  }
  return files;
}

function countOffenders(): Record<string, number> {
  const counts: Record<string, number> = {};
  const files = allSourceFiles();
  const indirect = indirectCallPattern(profileIdFunctionNames(files));

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const matches = [
      ...(src.match(OFFENDING_CALL) ?? []),
      ...(src.match(OFFENDING_INSERT) ?? []),
      ...(src.match(OFFENDING_ALIAS) ?? []),
      ...(src.match(OFFENDING_JSX_PROP) ?? []),
      ...(indirect ? (src.match(indirect) ?? []) : []),
    ];
    if (matches.length) {
      counts[path.relative(process.cwd(), file).split(path.sep).join('/')] = matches.length;
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
