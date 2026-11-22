// Two schema inventories (schema-inventory.sql) in, what was added, changed
// and dropped out. Used by backend-changes.mjs.
import fs from 'node:fs';

// The same canonicalisation as normalize() in scripts/e2e-remote/schema-dump.lib.sh:
// the server deparses one CHECK in two ways depending on how it was created.
export const normalize = (s) =>
  s
    .replace(/\('([^']+)'::character varying\)::text/g, "'$1'")
    .replace(/'([^']+)'::character varying/g, "'$1'")
    .replace(/\(\(ARRAY\[/g, '(ARRAY[')
    .replace(/\]\)::text\[\]\)/g, '])');

export function loadInventory(file) {
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    const [kind, key, sig = '', raw = ''] = line.split('\t');
    const detail = normalize(raw);
    map.set(`${kind}\t${key}`, {
      kind,
      key,
      // What is compared: the catalog's own signature (a hash where the
      // deparse is stable) plus the normalised text a person reads.
      sig: `${sig}|${detail}`,
      value: sig,
      detail,
      table: key.split('.')[0],
    });
  }
  return map;
}

export function diffInventories(before, after) {
  const id = (o) => `${o.kind}\t${o.key}`;
  const added = [...after.values()].filter((o) => !before.has(id(o)));
  const dropped = [...before.values()].filter((o) => !after.has(id(o)));
  const changed = [...after.values()]
    .filter((o) => before.has(id(o)) && before.get(id(o)).sig !== o.sig)
    .map((o) => ({ ...o, old: before.get(id(o)) }));
  // A new table's columns, indexes and constraints are part of "new table";
  // its policies and triggers stay listed — they decide who sees what.
  const newTables = new Set(added.filter((o) => o.kind === 'table').map((o) => o.key));
  const isPartOfNewTable = (o) =>
    newTables.has(o.table) && ['column', 'index', 'constraint'].includes(o.kind);
  const columnsOf = (table) => added.filter((o) => o.kind === 'column' && o.table === table).length;
  const policiesOf = (table) =>
    added.filter((o) => o.kind === 'policy' && o.table === table).length;
  // The same for a dropped table: its columns, indexes and constraints go with it.
  const droppedTables = new Set(dropped.filter((o) => o.kind === 'table').map((o) => o.key));
  const isPartOfDroppedTable = (o) =>
    droppedTables.has(o.table) && ['column', 'index', 'constraint'].includes(o.kind);
  return {
    added: added.filter((o) => !isPartOfNewTable(o)),
    changed,
    dropped: dropped.filter((o) => !isPartOfDroppedTable(o)),
    columnsOf,
    policiesOf,
  };
}
