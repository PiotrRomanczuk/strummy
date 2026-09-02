#!/usr/bin/env node
/**
 * Turns the nightly matrix's per-project Playwright JSON reports into one
 * triage document on stdout.
 *
 * The single job this script exists to do is SEPARATE REAL FAILURES FROM
 * FLAKES, because the downstream fixer agent acts on what this says. That
 * split is not guesswork: `retries: 2` is active under CI
 * (playwright.config.ts), so Playwright itself re-runs every failure and
 * reports `flaky` when a retry passed and `unexpected` only when the test
 * failed EVERY attempt. A run of this suite on 2026-08-26 produced 8 failures
 * of which only 4 reproduced — a fixer pointed at the raw 8 would have spent
 * the night "fixing" a network blip and an exhausted API balance.
 *
 * Usage: node scripts/ci/nightly-e2e-report.mjs <artifacts-dir> > report.md
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('usage: nightly-e2e-report.mjs <artifacts-dir>');
  process.exit(2);
}

/** Every results.json under the downloaded artifact tree, whatever its depth. */
function findResults(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) findResults(p, found);
    else if (entry === 'results.json') found.push(p);
  }
  return found;
}

/** Playwright nests suites arbitrarily deep; specs can hang off any level. */
function collectSpecs(suite, out = []) {
  for (const spec of suite.specs ?? []) out.push(spec);
  for (const child of suite.suites ?? []) collectSpecs(child, out);
  return out;
}

/** Raw error message of ONE attempt, whichever shape the reporter used. */
function messageOf(result) {
  return String(
    result?.error?.message ?? result?.errors?.[0]?.message ?? result?.error?.value ?? ''
  );
}

/** Every attempt's message, in order, with the empty ones dropped. */
function attemptMessages(test) {
  return (test.results ?? []).map(messageOf).filter(Boolean);
}

/**
 * First useful line of a failure, with ANSI codes and noise stripped.
 *
 * Reads the first ATTEMPT THAT CARRIES AN ERROR, not the last result: a flaky
 * test's last result is the retry that passed, so `.at(-1)` reported every
 * flake as "(no error message captured)" and made the flaky section useless
 * for spotting a test that fails the same way night after night.
 */
function errorLine(test) {
  const results = test.results ?? [];
  const result = results.find((r) => messageOf(r)) ?? results.at(-1);
  const clean = messageOf(result)
    .replace(/\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return clean[0] ? clean.slice(0, 3).join(' / ').slice(0, 300) : '(no error message captured)';
}

const files = findResults(artifactsDir);
if (files.length === 0) {
  console.log('# Nightly E2E\n\n**No results.json found.**');
  console.log(
    '\nEvery matrix leg failed before Playwright wrote a report — that is an infrastructure'
  );
  console.log('failure (build, dev stack, or runner), not a test failure. Check the job logs.');
  process.exit(0);
}

const projects = [];
for (const file of files) {
  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    projects.push({ name: file, unreadable: String(err.message) });
    continue;
  }
  const specs = (json.suites ?? []).flatMap((s) => collectSpecs(s));
  const failures = [];
  const flakes = [];
  let name = 'unknown';
  for (const spec of specs) {
    for (const test of spec.tests ?? []) {
      name = test.projectName || name;
      const entry = {
        title: spec.title,
        file: spec.file,
        line: spec.line,
        tags: spec.tags ?? [],
        error: errorLine(test),
        attempts: (test.results ?? []).length,
        // Every attempt's message, not just the representative one — the
        // outage split below reads all of them. See SERVER_DOWN.
        attemptErrors: attemptMessages(test),
      };
      if (test.status === 'unexpected') failures.push(entry);
      else if (test.status === 'flaky') flakes.push(entry);
    }
  }
  projects.push({ name, stats: json.stats ?? {}, failures, flakes });
}

projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

const allFailures = projects.flatMap((p) =>
  (p.failures ?? []).map((f) => ({ ...f, project: p.name }))
);
const allFlakes = projects.flatMap((p) => (p.flakes ?? []).map((f) => ({ ...f, project: p.name })));

/**
 * A failure whose error is "nothing was listening on the app's port" never
 * exercised a line of application code — the server was gone. Playwright's
 * retries hit the same dead socket, so a mid-run server crash produces
 * `unexpected` (failed on every attempt) and is indistinguishable, by status
 * alone, from a genuine reproducible failure.
 *
 * On 2026-08-29 that is exactly what happened: `next start` died partway
 * through the iPad Pro leg and the report announced 93 "reproducible failures"
 * of which 89 were that one crash. Separating them out is the same job this
 * script already does for flakes, and for the same reason — the downstream
 * fixer acts on what this says.
 *
 * Deliberately narrow: a refused connection means no process was listening.
 * Resets and empty responses can come from application code, so they stay in
 * the real-failure list.
 *
 * EVERY attempt is checked, not just the one `errorLine` picks. A server does
 * not die between attempts as a courtesy: the test running at the moment it
 * goes down reaches a half-dead process, times out, and only THEN starts
 * refusing on the retries. `errorLine` reports the first attempt, so such a
 * test looked like a plain timeout and landed in the actionable list.
 *
 * That is the 2026-09-02 run: the iPhone 17 Pro Max leg logged "app server on
 * :3400 was NOT answering when the suite finished", and two tests whose retries
 * were pure ERR_CONNECTION_REFUSED were reported as reproducible failures — a
 * form submit that "did not redirect" and a create form that "stayed on /new",
 * both of them a POST to a server that was no longer there.
 *
 * A test that refused on SOME attempts is therefore unverified, not failing:
 * nothing here can tell whether it would have failed against a live server, and
 * the wrong guess sends a fixer to change working code. Reported below with its
 * pre-outage error intact so a human can still judge it.
 */
const SERVER_DOWN = /ERR_CONNECTION_REFUSED|ECONNREFUSED/i;
const refusedCount = (f) => (f.attemptErrors ?? []).filter((m) => SERVER_DOWN.test(m)).length;

/** Never ran — every attempt hit a dead socket. */
const outages = [];
/** Ran against a server that was on its way out. Verdict not trustworthy. */
const unverified = [];
const realFailures = [];
for (const f of allFailures) {
  const refused = refusedCount(f);
  if (refused === 0) realFailures.push(f);
  else if (refused === (f.attemptErrors ?? []).length) outages.push(f);
  else unverified.push(f);
}
const infrastructure = [...outages, ...unverified];

/** Same test failing on several devices is ONE bug, not N. */
const byTest = new Map();
for (const f of realFailures) {
  const key = `${f.file}:${f.line} ${f.title}`;
  if (!byTest.has(key)) byTest.set(key, { ...f, projects: [], errors: new Map() });
  const entry = byTest.get(key);
  entry.projects.push(f.project);
  // Keep EVERY device's own error. Merging on file:line used to keep only the
  // first device's, so a test failing on two devices printed one device's cause
  // for both — which is how an iPad Pro server outage came to be reported as
  // the reason an iPhone SE test failed, hiding the real one.
  entry.errors.set(f.project, f.error);
  entry.attempts = Math.max(entry.attempts, f.attempts);
}

const out = [];
out.push('# Nightly E2E');
out.push('');
out.push(
  `Run: ${process.env.GITHUB_RUN_ID ? `#${process.env.GITHUB_RUN_ID}` : 'local'} · ${new Date().toISOString()}`
);
out.push('');

out.push('| Project | Passed | Failed | Flaky | Skipped |');
out.push('| --- | ---: | ---: | ---: | ---: |');
for (const p of projects) {
  if (p.unreadable) {
    out.push(`| ${p.name} | — | — | — | unreadable: ${p.unreadable} |`);
    continue;
  }
  const s = p.stats;
  out.push(
    `| ${p.name} | ${s.expected ?? 0} | ${s.unexpected ?? 0} | ${s.flaky ?? 0} | ${s.skipped ?? 0} |`
  );
}
out.push('');

const code = (s) => `\`${String(s).replace(/`/g, "'")}\``;

if (byTest.size === 0) {
  out.push('## No reproducible failures');
  out.push('');
  out.push(
    infrastructure.length > 0
      ? 'No test failed for a reason attributable to application code. See the infrastructure section below — the run is not green, it is incomplete.'
      : 'Every test either passed or passed on retry. Nothing to fix.'
  );
} else {
  out.push(`## Reproducible failures (${byTest.size})`);
  out.push('');
  out.push(
    'Each of these failed on **every** attempt including retries. These are the only entries a fixer should act on.'
  );
  out.push('');
  for (const t of byTest.values()) {
    out.push(`### \`${t.file}:${t.line}\` — ${t.title}`);
    out.push('');
    out.push(`- Devices: ${[...new Set(t.projects)].join(', ')}`);
    if (t.tags.length) out.push(`- Tags: ${t.tags.join(' ')}`);
    out.push(`- Attempts: ${t.attempts}`);
    const errors = [...t.errors.entries()];
    if (new Set(errors.map(([, e]) => e)).size === 1) {
      out.push(`- Error: ${code(errors[0][1])}`);
    } else {
      // Different devices, different causes. Printing one of them for all of
      // them is how a fixer ends up chasing the wrong bug on the wrong device.
      for (const [project, error] of errors) out.push(`- Error (${project}): ${code(error)}`);
    }
    out.push('');
  }
}

out.push('');
if (infrastructure.length > 0) {
  const byProject = new Map();
  for (const o of outages) {
    if (!byProject.has(o.project)) byProject.set(o.project, []);
    byProject.get(o.project).push(`${o.file}:${o.line}`);
  }

  out.push(`## Infrastructure — app server unreachable (${infrastructure.length})`);
  out.push('');
  out.push('**Not code failures. Do not fix these.** In every one of them the app server');
  out.push('refused the connection on at least one attempt, so the process serving the app was');
  out.push('gone while the test ran. A leg with a large block here lost its `next start`');
  out.push('partway through the suite; everything from that point on is unverified rather');
  out.push('than failing.');
  out.push('');
  out.push(
    "The server log is in that leg's `nightly-<project>` artifact, as `test-results/server.log`."
  );
  out.push('');
  if (outages.length > 0) {
    out.push('Never reached the app at all:');
    out.push('');
    for (const [project, tests] of byProject) {
      const shown = tests.slice(0, 5).join(', ');
      const rest = tests.length > 5 ? `, and ${tests.length - 5} more` : '';
      out.push(
        `- **${project}** — ${tests.length} test${tests.length === 1 ? '' : 's'}: ${shown}${rest}`
      );
    }
  }
  if (unverified.length > 0) {
    out.push('');
    out.push(
      `**Caught by the server going down mid-test (${unverified.length}).** These reached the app on` +
        ' an earlier attempt and were refused on the rest, which is the shape of a server dying'
    );
    out.push(
      'underneath a running test. The pre-outage error is kept below, but it is not evidence of'
    );
    out.push('a bug — re-read these in the next run, against a leg that kept its server.');
    out.push('');
    for (const u of unverified) {
      out.push(`- \`${u.file}:${u.line}\` — ${u.title} _(${u.project})_ — ${code(u.error)}`);
    }
  }
  out.push('');
}

out.push('');
if (allFlakes.length > 0) {
  out.push(`## Flaky — passed on retry (${allFlakes.length})`);
  out.push('');
  out.push('**Do not "fix" these.** They passed on a retry, so the code is not what failed.');
  out.push('Worth attention only if the same test appears here night after night.');
  out.push('');
  for (const f of allFlakes) {
    out.push(
      `- \`${f.file}:${f.line}\` — ${f.title} _(${f.project})_ — \`${f.error.replace(/`/g, "'")}\``
    );
  }
  out.push('');
}

const totalFailed = byTest.size;
out.push('---');
out.push('');
out.push(
  totalFailed === 0
    ? '**Verdict: green.** No action required.'
    : `**Verdict: ${totalFailed} reproducible failure${totalFailed === 1 ? '' : 's'} to triage.**`
);
// A leg that lost its server did not pass — it did not run. Saying "green"
// there is the one wrong answer this report can give, because nobody looks
// twice at a green night.
if (infrastructure.length > 0) {
  out.push('');
  out.push(
    `**⚠ Incomplete run:** ${infrastructure.length} further ` +
      `test${infrastructure.length === 1 ? '' : 's'} hit an app server that was not answering ` +
      `(${[...new Set(infrastructure.map((o) => o.project))].join(', ')}). ` +
      'Those results are unverified, not passing.'
  );
}

console.log(out.join('\n'));
