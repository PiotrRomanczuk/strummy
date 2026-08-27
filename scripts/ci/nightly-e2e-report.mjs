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
  const result =
    results.find((r) => r?.error?.message || r?.errors?.length || r?.error?.value) ??
    results.at(-1);
  const raw = result?.error?.message ?? result?.errors?.[0]?.message ?? result?.error?.value ?? '';
  const clean = String(raw)
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

/** Same test failing on several devices is ONE bug, not N. */
const byTest = new Map();
for (const f of allFailures) {
  const key = `${f.file}:${f.line} ${f.title}`;
  if (!byTest.has(key)) byTest.set(key, { ...f, projects: [] });
  byTest.get(key).projects.push(f.project);
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

if (byTest.size === 0) {
  out.push('## No reproducible failures');
  out.push('');
  out.push('Every test either passed or passed on retry. Nothing to fix.');
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
    out.push(`- Error: \`${t.error.replace(/`/g, "'")}\``);
    out.push('');
  }
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

console.log(out.join('\n'));
