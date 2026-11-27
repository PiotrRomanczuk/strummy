#!/usr/bin/env node
// Lint warning ratchet (.claude/rules/structure.md S9, #1218). ESLint warnings
// do not fail `npm run lint`, so without this their number only grows. The
// committed baseline holds the warning count per rule; CI fails when any rule
// has MORE warnings than its baseline. Fewer is fine — lower the baseline so
// the gain is locked in.
//
//   node scripts/ci/check-lint-baseline.mjs                    # check (CI)
//   node scripts/ci/check-lint-baseline.mjs --update-baseline  # lower it
//
// --update-baseline only ever LOWERS counts: it refuses while any rule is over
// its baseline. Raising one is a deliberate, reviewed hand edit of the JSON.
// Uses the same .eslintcache as `npm run lint`, so after a lint run it is fast.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const BASELINE = join(dirname(fileURLToPath(import.meta.url)), '.lint-baseline.json');
// Messages without a rule: unused eslint-disable directives and the like.
const NO_RULE = '(no rule)';

async function countWarnings() {
  const eslint = new ESLint({
    cache: true,
    cacheLocation: '.eslintcache',
    cacheStrategy: 'content',
  });
  const results = await eslint.lintFiles(['.']);
  const counts = {};
  let errors = 0;
  for (const file of results) {
    for (const msg of file.messages) {
      if (msg.severity === 2) errors++;
      else counts[msg.ruleId ?? NO_RULE] = (counts[msg.ruleId ?? NO_RULE] ?? 0) + 1;
    }
  }
  return { counts, errors };
}

const total = (counts) => Object.values(counts).reduce((sum, n) => sum + n, 0);

function readBaseline() {
  if (!existsSync(BASELINE)) return null;
  return JSON.parse(readFileSync(BASELINE, 'utf8')).rules;
}

function writeBaseline(counts) {
  const rules = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  const body = { total: total(counts), rules };
  writeFileSync(BASELINE, `${JSON.stringify(body, null, 2)}\n`);
}

function compare(baseline, counts) {
  const rules = new Set([...Object.keys(baseline), ...Object.keys(counts)]);
  const over = [];
  const under = [];
  for (const rule of [...rules].sort()) {
    const was = baseline[rule] ?? 0;
    const now = counts[rule] ?? 0;
    if (now > was) over.push({ rule, was, now });
    if (now < was) under.push({ rule, was, now });
  }
  return { over, under };
}

function printRows(title, rows) {
  if (rows.length === 0) return;
  console.log(title);
  for (const { rule, was, now } of rows) console.log(`  ${rule}: ${was} -> ${now}`);
}

async function main() {
  const isUpdate = process.argv.includes('--update-baseline');
  const { counts, errors } = await countWarnings();
  if (errors > 0) {
    console.error(`ESLint reports ${errors} error(s) — fix them first (npm run lint).`);
    process.exit(1);
  }
  const baseline = readBaseline();
  if (baseline === null) {
    if (!isUpdate) {
      console.error(`No baseline at ${BASELINE} — create it with --update-baseline.`);
      process.exit(1);
    }
    writeBaseline(counts);
    console.log(`Wrote a new baseline: ${total(counts)} warnings.`);
    return;
  }
  const { over, under } = compare(baseline, counts);
  if (over.length > 0) {
    printRows('Lint warnings over the baseline (fix them; see npm run lint):', over);
    if (isUpdate) console.error('--update-baseline only lowers counts; nothing written.');
    process.exit(1);
  }
  if (isUpdate) {
    writeBaseline(counts);
    console.log(`Baseline lowered to ${total(counts)} warnings (was ${total(baseline)}).`);
    return;
  }
  printRows('Fewer warnings than the baseline — lock it in:', under);
  if (under.length > 0) console.log('  npm run check:lint-baseline -- --update-baseline');
  console.log(`Lint ratchet OK: ${total(counts)} warnings, baseline ${total(baseline)}.`);
}

await main();
