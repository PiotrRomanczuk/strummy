#!/usr/bin/env node
// Blueprint catalogs — triggers, RLS, crons, notifications — into
// docs/app-blueprint/dashboard.html, as one JSON block the page renders.
//
//   node scripts/docs/build-catalogs.mjs [--db <catalog-db.json>]   rewrite the block
//   node scripts/docs/build-catalogs.mjs --check                    fail if the code half is stale
//
// The code half (crons, notifications) is read from the source tree here. The
// database half (triggers, policies, RLS) comes from refresh-catalog-db.sh on
// uwh — rebuilt from supabase/migrations — and, without --db, the block's
// existing copy is kept. Never edit the block by hand.
import fs from 'node:fs';
import path from 'node:path';
import { cronCatalog } from './catalog-crons.mjs';
import { notificationCatalog } from './catalog-notifications.mjs';
import { rlsMatrix } from './catalog-rls.mjs';

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'docs/app-blueprint/dashboard.html');
const OPEN = '<script type="application/json" id="catalog-data">';
const CLOSE = '</script>';

const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const dbFile = args.includes('--db') ? args[args.indexOf('--db') + 1] : null;

const html = fs.readFileSync(HTML, 'utf8');
const start = html.indexOf(OPEN);
const end = start < 0 ? -1 : html.indexOf(CLOSE, start);
const existing = start < 0 ? null : JSON.parse(html.slice(start + OPEN.length, end));

const raw = dbFile ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : existing?.db;
if (!raw) {
  console.error(
    'No database catalog yet: run scripts/docs/refresh-catalog-db.sh on uwh, then --db <file>.'
  );
  process.exit(2);
}
const db = { ...raw, rls: rlsMatrix(raw.policies) };
const code = {
  crons: cronCatalog(ROOT),
  notifications: notificationCatalog(ROOT, db.notificationSources ?? {}),
};

if (isCheck) {
  const stale = Object.keys(code).filter(
    (k) => JSON.stringify(code[k]) !== JSON.stringify(existing?.[k])
  );
  if (stale.length) {
    console.error(
      `dashboard.html catalogs out of date: ${stale.join(', ')}. Run: node scripts/docs/build-catalogs.mjs`
    );
    process.exit(1);
  }
  console.log('dashboard.html catalogs match the code.');
  process.exit(0);
}

// One record per line: a regenerated block diffs record by record.
function serialize(value, depth = 0) {
  if (Array.isArray(value) && value.some((x) => x && typeof x === 'object')) {
    return `[\n${value.map((x) => JSON.stringify(x)).join(',\n')}\n]`;
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && depth < 2) {
    const entries = Object.entries(value).map(
      ([k, v]) => `${JSON.stringify(k)}: ${serialize(v, depth + 1)}`
    );
    return `{\n${entries.join(',\n')}\n}`;
  }
  return JSON.stringify(value);
}
// `</` inside a string would end the <script> element early.
const body = serialize({ db, ...code }).replace(/<\//g, '<\\/');
const block = `${OPEN}\n${body}\n${CLOSE}`;
const next =
  start < 0
    ? html.replace('    <script>\n', `    ${block}\n    <script>\n`)
    : html.slice(0, start) + block + html.slice(end + CLOSE.length);
fs.writeFileSync(HTML, next);
console.log(
  `catalogs: ${db.triggers.length} triggers, ${db.policies.length} policies on ${Object.keys(db.rls).length} tables (migrations up to ${db.migrationsUpTo}), ` +
    `${code.crons.jobs.length} cron jobs, ${code.notifications.length} notification types`
);
