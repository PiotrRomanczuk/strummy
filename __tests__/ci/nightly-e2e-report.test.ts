import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The nightly triage report is the only thing the fixer agent reads, and it
 * runs unattended at 03:17. A wrong verdict here does not fail loudly — it
 * sends someone at a suite that was never broken, or marks a night green that
 * never ran. So the classification is pinned by tests rather than by review.
 *
 * The script is a standalone .mjs with top-level side effects, so it is driven
 * the way CI drives it: a fixture artifact tree in, markdown out.
 */

const SCRIPT = join(process.cwd(), 'scripts/ci/nightly-e2e-report.mjs');

type Failure = {
  title: string;
  file: string;
  line: number;
  error: string;
  status?: 'unexpected' | 'flaky';
  /**
   * Per-attempt error messages, when they differ. Defaults to `error` twice.
   * A server dying underneath a running test is only visible here: attempt 1
   * times out against the half-dead process, the retries are refused.
   */
  attemptErrors?: string[];
};

/** One project's results.json, shaped like Playwright's JSON reporter. */
function projectReport(project: string, failures: Failure[], expected = 100) {
  return {
    stats: {
      expected,
      unexpected: failures.filter((f) => (f.status ?? 'unexpected') === 'unexpected').length,
      flaky: failures.filter((f) => f.status === 'flaky').length,
      skipped: 0,
    },
    suites: [
      {
        specs: failures.map((f) => ({
          title: f.title,
          file: f.file,
          line: f.line,
          tags: [],
          tests: [
            {
              projectName: project,
              status: f.status ?? 'unexpected',
              results: (f.attemptErrors ?? [f.error, f.error]).map((message) => ({
                error: { message },
              })),
            },
          ],
        })),
        suites: [],
      },
    ],
  };
}

function runReport(
  projects: Record<string, Failure[]>,
  env: Record<string, string> = {}
): string {
  return withLegs(
    Object.entries(projects).map(([project, failures]) => ({ leg: project, project, failures })),
    env
  );
}

type Leg = { leg: string; project: string; failures: Failure[] };

/**
 * Writes one artifact directory per leg and runs the script over them.
 *
 * `leg` is the directory (`nightly-<leg>`), `project` is what that leg's
 * results.json claims. They are separate because the two disagreeing is a real
 * state: a leg that died before Playwright started leaves the previous run's
 * `test-results/` in place, and the upload step collects that instead.
 */
function withLegs(legs: Leg[], env: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'nightly-report-'));
  try {
    for (const { leg, project, failures } of legs) {
      // The literal name, as upload-artifact writes it: the real directory is
      // `nightly-Desktop Chrome`, space and all. Hyphenating it here would
      // have the fixture testing its own spelling rather than the script's.
      const legDir = join(dir, `nightly-${leg}`);
      mkdirSync(legDir, { recursive: true });
      writeFileSync(join(legDir, 'results.json'), JSON.stringify(projectReport(project, failures)));
    }
    return execFileSync('node', [SCRIPT, dir], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const NIGHTLY_SET = '["Desktop Chrome","iPhone SE","iPhone 17 Pro Max","iPad Pro"]';

/** The phrase nightly-e2e-issue.sh greps for to CLOSE the tracking issue. */
const GREEN_VERDICT = '**Verdict: green.**';

const REFUSED = 'Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3400/sign-in';

describe('nightly-e2e-report', () => {
  describe('a server that died mid-run', () => {
    // 2026-08-29: `next start` died partway through the iPad Pro leg. Every
    // test after that point refused on all three attempts, so Playwright
    // marked them `unexpected` — and the report announced "93 reproducible
    // failures" when 89 of them never ran a line of application code.
    const report = runReport({
      'iPad Pro': [
        {
          title: 'landing page renders',
          file: 'e2e/smoke/landing.spec.ts',
          line: 39,
          error: REFUSED,
        },
        {
          title: 'for-teachers renders',
          file: 'e2e/smoke/teachers.spec.ts',
          line: 21,
          error: REFUSED,
        },
      ],
      'iPhone SE': [
        {
          title: 'mark all notifications as read',
          file: 'e2e/notifications/inbox.spec.ts',
          line: 106,
          error: "locator.click: Timeout 15000ms exceeded. / waiting for getByRole('button')",
        },
      ],
    });

    it('keeps refused connections out of the reproducible-failure list', () => {
      expect(report).toContain('## Reproducible failures (1)');

      // The refused tests are still *listed* further down, under
      // infrastructure. What matters is that they are not in the section the
      // fixer is told to act on.
      const actionable = report.slice(
        report.indexOf('## Reproducible failures'),
        report.indexOf('## Infrastructure')
      );
      expect(actionable).toContain('e2e/notifications/inbox.spec.ts:106');
      expect(actionable).not.toContain('e2e/smoke/landing.spec.ts:39');
      expect(actionable).not.toContain('ERR_CONNECTION_REFUSED');
    });

    it('reports them as infrastructure, grouped by the leg that lost its server', () => {
      expect(report).toContain('## Infrastructure — app server unreachable (2)');
      expect(report).toContain('**Not code failures. Do not fix these.**');
      expect(report).toContain('**iPad Pro** — 2 tests');
      expect(report).toContain('test-results/server.log');
    });

    it('does not let an incomplete run read as a passing one', () => {
      expect(report).toContain('**⚠ Incomplete run:**');
      expect(report).toContain('hit an app server that was not answering (iPad Pro)');
      expect(report).not.toContain('**Verdict: green.**');
    });
  });

  describe('a server that died underneath a running test', () => {
    // 2026-09-02: the iPhone 17 Pro Max leg logged "app server on :3400 was NOT
    // answering when the suite finished". The test running at the moment it
    // went down reached a half-dead process — its POST simply never came back —
    // and only the retries were refused. The report reads the FIRST attempt, so
    // that test was published as a reproducible failure: "create form submits
    // and redirects" apparently stopped redirecting. Nothing was wrong with it.
    const report = runReport({
      'iPhone 17 Pro Max': [
        {
          title: 'create form submits and redirects to student profile',
          file: 'e2e/teacher/student-onboarding.spec.ts',
          line: 98,
          error: 'TimeoutError: page.waitForURL: Timeout 20000ms exceeded.',
          attemptErrors: [
            'TimeoutError: page.waitForURL: Timeout 20000ms exceeded.',
            REFUSED,
            REFUSED,
          ],
        },
        {
          title: 'users list loads',
          file: 'e2e/teacher/users-management.spec.ts',
          line: 75,
          error: REFUSED,
          attemptErrors: [REFUSED, REFUSED, REFUSED],
        },
      ],
      'iPad Pro': [
        {
          title: 'student signs out via topbar',
          file: 'e2e/auth/sign-out.spec.ts',
          line: 29,
          error: 'TimeoutError: page.click: Timeout 15000ms exceeded.',
        },
      ],
    });

    it('keeps a test whose retries were refused out of the actionable list', () => {
      const actionable = report.slice(
        report.indexOf('## Reproducible failures'),
        report.indexOf('## Infrastructure')
      );

      // The iPad Pro leg kept its server, so its timeout is a real failure.
      expect(report).toContain('## Reproducible failures (1)');
      expect(actionable).toContain('e2e/auth/sign-out.spec.ts:29');
      expect(actionable).not.toContain('e2e/teacher/student-onboarding.spec.ts:98');
    });

    it('counts it as infrastructure alongside the tests that never ran at all', () => {
      expect(report).toContain('## Infrastructure — app server unreachable (2)');
      expect(report).toContain(
        '**iPhone 17 Pro Max** — 1 test: e2e/teacher/users-management.spec.ts:75'
      );
    });

    it('still shows its pre-outage error, flagged as no evidence of a bug', () => {
      expect(report).toContain('**Caught by the server going down mid-test (1).**');
      expect(report).toContain('e2e/teacher/student-onboarding.spec.ts:98');
      expect(report).toContain('TimeoutError: page.waitForURL: Timeout 20000ms exceeded.');
      expect(report).toContain('it is not evidence of');
    });

    it('does not let the surviving legs make the night look complete', () => {
      expect(report).toContain('**⚠ Incomplete run:** 2 further tests');
      expect(report).toContain('(iPhone 17 Pro Max)');
    });
  });

  it('leaves a test alone when no attempt was refused', () => {
    // The guard is "any attempt refused", not "any attempt timed out" — a test
    // that fails three different ways against a healthy server is still a bug.
    const report = runReport({
      'iPad Pro': [
        {
          title: 'opens the detail panel',
          file: 'e2e/student/repertoire.spec.ts',
          line: 130,
          error: 'TimeoutError: locator.click: Timeout 15000ms exceeded.',
          attemptErrors: [
            'TimeoutError: locator.click: Timeout 15000ms exceeded.',
            'Error: element is not stable',
            'Error: expect(locator).toBeVisible() failed',
          ],
        },
      ],
    });

    expect(report).toContain('## Reproducible failures (1)');
    expect(report).toContain('e2e/student/repertoire.spec.ts:130');
    expect(report).not.toContain('## Infrastructure');
  });

  it('never calls a run green when the only "passes" are an outage', () => {
    const report = runReport({
      'iPad Pro': [
        {
          title: 'landing page renders',
          file: 'e2e/smoke/landing.spec.ts',
          line: 39,
          error: REFUSED,
        },
      ],
    });

    expect(report).toContain('## No reproducible failures');
    expect(report).toContain('the run is not green, it is incomplete');
    expect(report).toContain('**⚠ Incomplete run:**');
  });

  describe('one test failing on several devices', () => {
    it("reports each device its own error, not the first device's", () => {
      // Merging on file:line used to keep only the first device's error, so an
      // iPad Pro outage was printed as the reason an iPhone SE test failed —
      // hiding the real cause behind a message about a different machine.
      const report = runReport({
        'iPad Pro': [
          {
            title: 'toggles play/pause',
            file: 'e2e/teacher/audio.spec.ts',
            line: 54,
            error: 'Error: element is not stable',
          },
        ],
        'iPhone SE': [
          {
            title: 'toggles play/pause',
            file: 'e2e/teacher/audio.spec.ts',
            line: 54,
            error: 'Error: expected pattern /pause/i',
          },
        ],
      });

      expect(report).toContain('## Reproducible failures (1)');
      expect(report).toContain('- Devices: iPad Pro, iPhone SE');
      expect(report).toContain('- Error (iPad Pro): `Error: element is not stable`');
      expect(report).toContain('- Error (iPhone SE): `Error: expected pattern /pause/i`');
    });

    it('collapses to a single line when every device failed the same way', () => {
      const report = runReport({
        'iPad Pro': [
          { title: 'toggles', file: 'e2e/teacher/audio.spec.ts', line: 54, error: 'Error: nope' },
        ],
        'iPhone SE': [
          { title: 'toggles', file: 'e2e/teacher/audio.spec.ts', line: 54, error: 'Error: nope' },
        ],
      });

      expect(report).toContain('- Error: `Error: nope`');
      expect(report).not.toContain('- Error (iPad Pro):');
    });
  });

  it('still reports a genuinely clean run as green', () => {
    const report = runReport({ 'Desktop Chrome': [] });

    expect(report).toContain('## No reproducible failures');
    expect(report).toContain('Every test either passed or passed on retry.');
    expect(report).toContain('**Verdict: green.**');
    expect(report).not.toContain('Incomplete run');
  });

  /**
   * 2026-10-05, run #56: the Desktop Chrome leg died before Playwright started
   * (so it wrote no results of its own), `test-results/` on the self-hosted
   * runner still held the previous night's iPad Pro files, and the upload step
   * collected those. Three legs were genuinely green, this script read four
   * green-looking results, and printed `Verdict: green.` for a run whose matrix
   * was red. nightly-e2e-issue.sh then filed nothing — so the fixer routine
   * found no open issue and reported the suite as passing.
   *
   * Reading the results alone cannot tell that night from a clean one. These
   * cover the three signals that can.
   */
  describe('a leg that never reported', () => {
    it('does not call the night green when the matrix job went red', () => {
      const report = runReport(
        { 'Desktop Chrome': [], 'iPhone SE': [] },
        { NIGHTLY_MATRIX_RESULT: 'failure' }
      );

      expect(report).not.toContain(GREEN_VERDICT);
      expect(report).toContain('## ⚠ Incomplete run — not a green night');
      expect(report).toContain('**Verdict: incomplete run — no verdict.**');
      expect(report).toContain('the matrix job finished `failure`');
    });

    it('names an expected leg that filed no results at all', () => {
      const report = runReport(
        { 'Desktop Chrome': [], 'iPhone SE': [] },
        { NIGHTLY_EXPECTED_PROJECTS: NIGHTLY_SET, NIGHTLY_MATRIX_RESULT: 'success' }
      );

      expect(report).not.toContain(GREEN_VERDICT);
      expect(report).toContain('iPhone 17 Pro Max');
      expect(report).toContain('iPad Pro');
      expect(report).toContain('Legs that filed no results of their own (2)');
    });

    it("spots a leg that uploaded an earlier run's results for another project", () => {
      // Every leg runs `--project=<its own name>`, so a results.json naming a
      // different project is always a leftover. This is the shape that slipped
      // through: nothing was MISSING, all four legs uploaded something.
      // The leftover file carries the earlier run's own specs — that is what
      // names the project inside it. On 2026-10-05 it was an iPad Pro flake on
      // the public fretboard page, which is why the Desktop Chrome leg's
      // artifact held an `…-iPad-Pro/error-context.md`.
      const strayFlake: Failure = {
        title: 'offers the studio instead of a sign-up',
        file: 'e2e/public/fretboard-public.spec.ts',
        line: 61,
        error: 'TimeoutError: locator.click',
        status: 'flaky',
      };
      const report = withLegs(
        [
          { leg: 'Desktop Chrome', project: 'iPad Pro', failures: [strayFlake] },
          { leg: 'iPhone SE', project: 'iPhone SE', failures: [strayFlake] },
          { leg: 'iPhone 17 Pro Max', project: 'iPhone 17 Pro Max', failures: [strayFlake] },
          { leg: 'iPad Pro', project: 'iPad Pro', failures: [strayFlake] },
        ],
        { NIGHTLY_EXPECTED_PROJECTS: NIGHTLY_SET, NIGHTLY_MATRIX_RESULT: 'success' }
      );

      expect(report).not.toContain(GREEN_VERDICT);
      expect(report).toContain('the `Desktop Chrome` leg uploaded results reporting `iPad Pro`');
      expect(report).toContain('Treat it as not run.');
    });

    it('matches leg names whose spaces survived as hyphens', () => {
      // The artifact directory keeps "nightly-Desktop Chrome"; anything that
      // has been through a filename arrives hyphenated. Neither spelling may
      // decide the verdict.
      const report = runReport(
        { 'Desktop Chrome': [] },
        { NIGHTLY_EXPECTED_PROJECTS: '["Desktop-Chrome"]', NIGHTLY_MATRIX_RESULT: 'success' }
      );

      expect(report).toContain(GREEN_VERDICT);
      expect(report).not.toContain('Incomplete run');
    });

    it('stays green when every expected leg reported and the matrix passed', () => {
      const flake: Failure = {
        title: 'offers the studio instead of a sign-up',
        file: 'e2e/public/fretboard-public.spec.ts',
        line: 61,
        error: 'TimeoutError: locator.click',
        status: 'flaky',
      };
      const report = withLegs(
        [
          { leg: 'Desktop Chrome', project: 'Desktop Chrome', failures: [flake] },
          { leg: 'iPhone SE', project: 'iPhone SE', failures: [flake] },
          { leg: 'iPhone 17 Pro Max', project: 'iPhone 17 Pro Max', failures: [flake] },
          { leg: 'iPad Pro', project: 'iPad Pro', failures: [flake] },
        ],
        { NIGHTLY_EXPECTED_PROJECTS: NIGHTLY_SET, NIGHTLY_MATRIX_RESULT: 'success' }
      );

      expect(report).toContain(GREEN_VERDICT);
      expect(report).not.toContain('Incomplete run');
    });

    it('keeps reporting real failures when a leg is also missing', () => {
      const report = runReport(
        {
          'Desktop Chrome': [
            {
              title: 'saves a lesson',
              file: 'e2e/teacher/lessons.spec.ts',
              line: 42,
              error: 'Error: expected /lessons/',
            },
          ],
        },
        { NIGHTLY_EXPECTED_PROJECTS: NIGHTLY_SET, NIGHTLY_MATRIX_RESULT: 'failure' }
      );

      expect(report).toContain('## Reproducible failures (1)');
      expect(report).toContain('e2e/teacher/lessons.spec.ts:42');
      expect(report).toContain('**Verdict: 1 reproducible failure to triage.**');
      expect(report).toContain('**⚠ Incomplete run:**');
    });
  });

  it('leaves the flaky section alone — a retry that passed is not a bug', () => {
    const report = runReport({
      'iPhone SE': [
        {
          title: 'shadow claim',
          file: 'e2e/auth/shadow.spec.ts',
          line: 123,
          error: 'TimeoutError: page.waitForURL',
          status: 'flaky',
        },
      ],
    });

    expect(report).toContain('## Flaky — passed on retry (1)');
    expect(report).toContain('**Do not "fix" these.**');
    expect(report).toContain('## No reproducible failures');
  });
});
