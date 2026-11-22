#!/usr/bin/env node
// "Zmiany backendu": what merging test → main will change in production's
// public schema, written for a person, not as SQL.
//
//   node scripts/review/backend-changes.mjs <before.tsv> <after.tsv> [classify.txt [migrations.sql]]
//
// before/after: schema-inventory.sql output (production, StrummyTest). classify:
// `migrate-db.sh classify` lines for the migrations test has and main has not;
// migrations.sql: those files' text — an object none of them names is marked.
// Markdown on stdout; the review page renders it with md-lite (lists, bold, code).
import fs from 'node:fs';
import { diffInventories, loadInventory } from './schema-diff.mjs';

const [beforeFile, afterFile, classifyFile, sqlFile] = process.argv.slice(2);
if (!beforeFile || !afterFile) {
  console.error(
    'usage: backend-changes.mjs <before.tsv> <after.tsv> [classify.txt [migrations.sql]]'
  );
  process.exit(2);
}
const before = loadInventory(beforeFile);
const after = loadInventory(afterFile);
const diff = diffInventories(before, after);

const KIND = {
  table: 'tabela',
  view: 'widok',
  column: 'kolumna',
  function: 'funkcja',
  trigger: 'trigger',
  policy: 'polityka RLS',
  index: 'indeks',
  constraint: 'ograniczenie',
  enum: 'typ wyliczeniowy',
};
const ORDER = Object.keys(KIND);
const byOrder = (a, b) =>
  ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.key.localeCompare(b.key);
const code = (s, max = 240) => {
  const t = String(s).replace(/`/g, "'");
  return `\`${t.length > max ? `${t.slice(0, max)}…` : t}\``;
};
const trigger = (def) => {
  const m =
    /^CREATE (?:CONSTRAINT )?TRIGGER \S+ (.*?) ON \S+ (.*?)EXECUTE (?:FUNCTION|PROCEDURE) (.*)$/.exec(
      def
    );
  return m ? `${m[1]} · ${m[2].trim().toLowerCase()} → ${m[3]}` : def;
};
// What a person reads for an object: a column's type, a trigger's timing, a
// policy's rule, a constraint's definition.
const shown = (o) =>
  ['column', 'enum'].includes(o.kind)
    ? o.value
    : o.kind === 'trigger'
      ? trigger(o.detail)
      : o.detail;
const label = (o) => {
  if (o.kind === 'column' || !o.key.includes('.')) return `${KIND[o.kind]} \`${o.key}\``;
  return `${KIND[o.kind]} \`${o.key.slice(o.table.length + 1)}\` na \`${o.table}\``;
};

function addedLine(o) {
  if (o.kind === 'table') {
    const rls = o.detail === 'rls' ? 'RLS włączone' : '**bez RLS**';
    return `${label(o)} — kolumn: ${diff.columnsOf(o.key)}, ${rls}, polityk: ${diff.policiesOf(o.key)}`;
  }
  if (o.kind === 'function') return `${label(o)}${o.detail ? ` · **${o.detail}**` : ''}`;
  if (o.kind === 'view') return label(o);
  return `${label(o)}: ${code(shown(o))}`;
}

function changedLine(o) {
  const was = o.old;
  if (o.kind === 'function') {
    const mode =
      o.detail !== was.detail ? ` (${was.detail || 'invoker'} → ${o.detail || 'invoker'})` : '';
    return `${label(o)} — zmieniona treść${mode}`;
  }
  if (o.kind === 'view') return `${label(o)} — zmieniona definicja`;
  if (o.kind === 'table') {
    const rls = (x) => (x.detail === 'rls' ? 'tak' : 'nie');
    return `${label(o)} — RLS: ${rls(was)} → ${o.detail === 'rls' ? 'tak' : '**nie**'}`;
  }
  return `${label(o)}: ${code(shown(was), 160)} → ${code(shown(o), 160)}`;
}

const migrations =
  classifyFile && fs.existsSync(classifyFile)
    ? fs.readFileSync(classifyFile, 'utf8').split('\n').filter(Boolean)
    : null;
const isChanged = diff.added.length + diff.changed.length + diff.dropped.length > 0;
const out = [
  '**Co scalenie `test` → `main` zmieni w schemacie produkcji** — katalog `StrummyTest` (baza gałęzi `test`) wobec produkcji.',
];
if (migrations?.length) {
  out.push('', `Migracje, których \`main\` nie ma (${migrations.length}):`);
  for (const line of migrations) {
    const m = /^(additive|NEEDS APPROVAL) ([^:]+)(?:: (.*))?$/.exec(line);
    if (!m) continue;
    const verdict =
      m[1] === 'additive' ? 'tylko dodaje' : `**wymaga akceptacji na \`production-db\`**: ${m[3]}`;
    out.push(`- \`${m[2]}\` — ${verdict}`);
  }
} else if (migrations && isChanged) {
  out.push(
    '',
    '**Uwaga: `test` nie ma żadnej migracji, której brakuje `main`, a schematy się różnią.** `StrummyTest` wyprzedza swoją gałąź (odświeżona z dev albo zmiana ręczna) — poniższa lista nie jest skutkiem scalenia. Kontrola odtworzenia migracji `test` (Deploy DB) powinna być czerwona.'
  );
}
// The object's own name (a column's, a function's without arguments) must
// appear in the migrations main lacks; if it does not, the database got it some
// other way (refreshed from dev, a hand change) and the merge will not bring it.
const sql =
  sqlFile && fs.existsSync(sqlFile) ? fs.readFileSync(sqlFile, 'utf8').toLowerCase() : null;
// Arguments are cut off first: a schema-qualified argument type has a dot too.
const ownName = (o) => {
  const bare = o.key.split('(')[0];
  return bare.slice(bare.lastIndexOf('.') + 1).toLowerCase();
};
// Postgres names these itself (<table>_<column>_fkey, _pkey, _key, _check,
// _idx), so a migration that adds `references songs(id)` never spells the name
// out; what it does name is the table.
const AUTO_NAME = /_(pkey|fkey|key|check|idx|excl)$/;
const searched = (o) =>
  ['constraint', 'index'].includes(o.kind) && AUTO_NAME.test(ownName(o))
    ? o.table.toLowerCase()
    : ownName(o);
// Whole word only: `id` or `status` must not be found inside `valid_until`.
const mentions = (text, name) =>
  new RegExp(`(?<![a-z0-9_])${name.replace(/[^a-z0-9_]/g, '\\$&')}(?![a-z0-9_])`).test(text);
const unexplained = (o) =>
  sql && migrations?.length && !mentions(sql, searched(o))
    ? ' · ⚠ żadna migracja z listy go nie wymienia'
    : '';
const section = (title, items, line) => {
  if (items.length)
    out.push(
      '',
      `**${title} (${items.length}):**`,
      ...items.sort(byOrder).map((o) => `- ${line(o)}${unexplained(o)}`)
    );
};
section('Nowe', diff.added, addedLine);
section('Zmienione', diff.changed, changedLine);
section('Usunięte — przy wdrożeniu czekają na akceptację', diff.dropped, label);
if (!isChanged)
  out.push(
    '',
    'Schemat `public` produkcji i `StrummyTest` jest taki sam — scalenie nie zmienia bazy.'
  );
out.push(
  '',
  `_Porównane obiekty: ${before.size} na produkcji, ${after.size} na \`StrummyTest\` (tabele, kolumny, funkcje, triggery, polityki, indeksy, ograniczenia, typy)._`
);
process.stdout.write(`${out.join('\n')}\n`);
