#!/usr/bin/env node
// Turns a review run (tests/review/) into the gallery a human reads:
//
//   node scripts/review/build-gallery.mjs <review-out>
//
// Reads manifest.jsonl (one line per screen and device), cast.json and
// meta.json from <review-out>; writes index.html (images stay next to it, not
// inlined) and summary.md (the short version filed on the review page).
// Changed and broken screens come first, open; unchanged ones are folded away.
import fs from 'node:fs';
import path from 'node:path';
import { renderPage } from './gallery-page.mjs';
import { missingEntries, problem } from './manifest-gaps.mjs';

const out = path.resolve(process.argv[2] ?? 'review-out');
const read = (name, fallback) => {
  const file = path.join(out, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
};

const entries = fs
  .readFileSync(path.join(out, 'manifest.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
if (!entries.length) {
  console.error(`no screens in ${out}/manifest.jsonl — the review run captured nothing`);
  process.exit(1);
}

const meta = read('meta.json', {});
const cast = read('cast.json', { cast: [] });
const order = cast.cast.map((p) => p.key);
const RANK = { same: 0, changed: 1, error: 2 };
const PROJECTS = ['desktop', 'telefon'];
entries.push(...missingEntries(cast.cast, entries, PROJECTS));

// One group per screen: the same step on every device.
const groups = new Map();
for (const e of entries) {
  const id = `${e.persona}/${e.step}`;
  const g = groups.get(id) ?? { ...e, shots: [], status: 'same' };
  g.shots.push(e);
  if (RANK[e.status] > RANK[g.status]) g.status = e.status;
  groups.set(id, g);
}
const sorted = [...groups.values()].sort(
  (a, b) => order.indexOf(a.persona) - order.indexOf(b.persona) || a.step - b.step
);
for (const g of sorted) {
  g.shots.sort((a, b) => PROJECTS.indexOf(a.project) - PROJECTS.indexOf(b.project));
}

const byStatus = (s) => sorted.filter((g) => g.status === s);
const counts = { error: byStatus('error').length, changed: byStatus('changed').length };
counts.same = sorted.length - counts.error - counts.changed;

fs.writeFileSync(
  path.join(out, 'index.html'),
  renderPage({ meta, mode: cast.mode, groups: sorted, counts })
);

const short = (sha) => (sha ? String(sha).slice(0, 7) : '?');
const devices = (g, status) =>
  g.shots
    .filter((s) => !status || s.status === status)
    .map((s) => s.project)
    .join(', ');
const lines = [
  `**Zmienione: ${counts.changed} · z błędem: ${counts.error} · bez zmian: ${counts.same}** — ` +
    `ekrany \`test\` ${short(meta.test_sha)} wobec \`main\` ${short(meta.main_sha)} (desktop i telefon).`,
];
if (counts.error) {
  lines.push('', 'Z błędem na `test`:');
  for (const g of byStatus('error')) {
    const s = g.shots.find((x) => x.status === 'error');
    lines.push(`- ${g.personaLabel} · ${g.title} (${devices(g, 'error')}): ${problem(s)}`);
  }
}
if (counts.changed) {
  lines.push('', 'Zmienione:');
  for (const g of byStatus('changed'))
    lines.push(`- ${g.personaLabel} · ${g.title} (${devices(g, 'changed')})`);
}
if (meta.gallery_url) lines.push('', `[Otwórz galerię](${meta.gallery_url})`);
fs.writeFileSync(path.join(out, 'summary.md'), `${lines.join('\n')}\n`);

console.log(
  `gallery: ${sorted.length} screens — ${counts.changed} changed, ${counts.error} broken, ${counts.same} unchanged`
);
