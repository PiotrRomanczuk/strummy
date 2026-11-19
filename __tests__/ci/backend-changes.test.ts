import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * "Zmiany backendu" is what the owner reads instead of SQL before production
 * gets test's migrations. A change it misses is a change nobody reviews; a
 * change it invents (the same CHECK deparsed two ways) teaches the reader to
 * skip it. Both directions are pinned here, through the CLI the workflow runs.
 */

const SCRIPT = join(process.cwd(), 'scripts/review/backend-changes.mjs');
type Row = [kind: string, key: string, sig: string, detail?: string];

const BASE: Row[] = [
  ['table', 'lessons', 'true', 'rls'],
  ['column', 'lessons.id', 'uuid not null default gen_random_uuid()', ''],
  ['column', 'lessons.status', 'text', ''],
  [
    'constraint',
    'lessons.lessons_kind_check',
    '',
    "CHECK (((kind)::text = ANY ((ARRAY['a'::character varying, 'b'::character varying])::text[])))",
  ],
  ['function', 'is_admin()', 'h1', 'security definer'],
];

function run(before: Row[], after: Row[], classify?: string, migrationsSql?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'backend-changes-'));
  const tsv = (rows: Row[]) =>
    rows.map((r) => [r[0], r[1], r[2], r[3] ?? ''].join('\t')).join('\n');
  writeFileSync(join(dir, 'before.tsv'), tsv(before));
  writeFileSync(join(dir, 'after.tsv'), tsv(after));
  const args = [SCRIPT, join(dir, 'before.tsv'), join(dir, 'after.tsv')];
  if (classify !== undefined) {
    writeFileSync(join(dir, 'classify.txt'), classify);
    args.push(join(dir, 'classify.txt'));
  }
  if (migrationsSql !== undefined) {
    writeFileSync(join(dir, 'migrations.sql'), migrationsSql);
    args.push(join(dir, 'migrations.sql'));
  }
  const out = execFileSync('node', args, { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return out;
}

describe('backend changes', () => {
  it('reads a CHECK deparsed two ways as the same constraint', () => {
    const after = BASE.map((r): Row =>
      r[0] === 'constraint'
        ? [
            r[0],
            r[1],
            '',
            "CHECK (((kind)::text = ANY (ARRAY[('a'::character varying)::text, ('b'::character varying)::text])))",
          ]
        : r
    );
    expect(run(BASE, after)).toContain('jest taki sam — scalenie nie zmienia bazy');
  });

  it('folds a new table into one line, but lists its policies and triggers', () => {
    const out = run(BASE, [
      ...BASE,
      ['table', 'credits', 'true', 'rls'],
      ['column', 'credits.id', 'uuid not null', ''],
      ['column', 'credits.amount', 'integer', ''],
      ['constraint', 'credits.credits_pkey', '', 'PRIMARY KEY (id)'],
      [
        'policy',
        'credits.credits_select_own',
        'PERMISSIVE',
        'SELECT for authenticated using ((student_id = current_profile_id()))',
      ],
      [
        'trigger',
        'lessons.trg_sync',
        'h2',
        'CREATE TRIGGER trg_sync AFTER INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION sync()',
      ],
    ]);
    expect(out).toContain('**Nowe (3):**');
    expect(out).toContain('- tabela `credits` — kolumn: 2, RLS włączone, polityk: 1');
    expect(out).toContain(
      '- polityka RLS `credits_select_own` na `credits`: `SELECT for authenticated using ((student_id = current_profile_id()))`'
    );
    expect(out).toContain(
      '- trigger `trg_sync` na `lessons`: `AFTER INSERT OR UPDATE · for each row → sync()`'
    );
    expect(out).not.toContain('credits.amount');
  });

  it('says what changed and what was dropped, and warns about a table without RLS', () => {
    const after = BASE.filter((r) => r[1] !== 'is_admin()').map((r): Row =>
      r[1] === 'lessons.status' ? [r[0], r[1], 'lesson_status not null', ''] : r
    );
    after.push(['table', 'notes', 'false', '']);
    const out = run(BASE, after);
    expect(out).toContain('- kolumna `lessons.status`: `text` → `lesson_status not null`');
    expect(out).toContain(
      '**Usunięte — przy wdrożeniu czekają na akceptację (1):**\n- funkcja `is_admin()`'
    );
    expect(out).toContain('tabela `notes` — kolumn: 0, **bez RLS**');
  });

  it('lists the migrations main lacks with the verdict migrate-db.sh would apply', () => {
    const out = run(
      BASE,
      [...BASE, ['column', 'lessons.note', 'text', '']],
      'additive 20261101000000_note.sql\nNEEDS APPROVAL 20261102000000_drop.sql: drop column\n'
    );
    expect(out).toContain('Migracje, których `main` nie ma (2):');
    expect(out).toContain('- `20261101000000_note.sql` — tylko dodaje');
    expect(out).toContain(
      '- `20261102000000_drop.sql` — **wymaga akceptacji na `production-db`**: drop column'
    );
    expect(out).not.toContain('Uwaga');
  });

  it('marks an object none of the listed migrations names', () => {
    const out = run(
      BASE,
      [...BASE, ['column', 'lessons.note', 'text', ''], ['column', 'lessons.stray', 'text', '']],
      'additive 20261101000000_note.sql\n',
      'alter table public.lessons add column if not exists note text;'
    );
    expect(out).toContain('- kolumna `lessons.note`: `text`\n');
    expect(out).toContain(
      '- kolumna `lessons.stray`: `text` · ⚠ żadna migracja z listy go nie wymienia'
    );
  });

  it('warns when the database differs but the branch has no migration to explain it', () => {
    const out = run(BASE, [...BASE, ['column', 'lessons.note', 'text', '']], '');
    expect(out).toContain('`StrummyTest` wyprzedza swoją gałąź');
  });
});
