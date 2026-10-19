/**
 * @jest-environment node
 *
 * The approval rule for production migrations (.claude/rules/migrations.md):
 * adding is automatic, removing waits for the owner. `migrate-db.sh classify`
 * is the same code path `apply` enforces, and needs no database.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCRIPT = join(__dirname, 'migrate-db.sh');

function classify(files: Record<string, string>): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), 'migrate-classify-'));
  Object.entries(files).forEach(([name, sql]) => writeFileSync(join(dir, name), sql));
  const paths = readdirSync(dir).map((f) => join(dir, f));
  const out = execFileSync('bash', [SCRIPT, 'classify', ...paths], { encoding: 'utf8' });
  return Object.fromEntries(
    out
      .trim()
      .split('\n')
      .map((line) => {
        const match = line.match(/^(NEEDS APPROVAL|additive) (\S+?):?(?: (.*))?$/);
        return [match?.[2] ?? line, match?.[1] === 'additive' ? 'additive' : `approval: ${match?.[3]}`];
      })
  );
}

describe('migrate-db.sh classify', () => {
  it('lets every kind of addition through', () => {
    const result = classify({
      '1_add.sql': `create table if not exists public.n (id int);
        alter table public.n add column if not exists y text;
        create index if not exists ix_n_y on public.n (y);
        alter type public.e add value if not exists 'z';`,
    });
    expect(result['1_add.sql']).toBe('additive');
  });

  it('treats drop-then-recreate of the same object as the idempotency idiom', () => {
    const result = classify({
      '1_fn.sql': `drop function if exists public.f(int);
        create or replace function public.f(int) returns int language sql as $$ select 1 $$;`,
      '2_policy.sql': `drop policy if exists "p_read" on public.t;
        create policy p_read on public.t for select using (true);`,
      '3_constraint.sql': `alter table public.t drop constraint if exists t_c;
        alter table public.t add constraint t_c check (x > 0);`,
      '4_index.sql': `drop index if exists public.ix_a; create unique index if not exists ix_a on public.t (a);`,
    });
    expect(Object.values(result)).toEqual(['additive', 'additive', 'additive', 'additive']);
  });

  it('needs approval for anything that removes, renames or rewrites', () => {
    const result = classify({
      '1_table.sql': 'drop table if exists public.old;',
      '2_column.sql': 'alter table public.t drop column if exists c;',
      '3_fn_only.sql': 'drop function if exists public.f(int);',
      '4_policy_only.sql': 'drop policy if exists p on public.t;',
      '5_rename.sql': 'alter table public.t rename column a to b;',
      '6_type.sql': 'alter table public.t alter column a type bigint;',
      '7_delete.sql': 'delete from public.t where true;',
      '8_truncate.sql': 'truncate public.t;',
    });
    Object.entries(result).forEach(([file, verdict]) => expect([file, verdict]).toEqual([file, expect.stringMatching(/^approval: /)]));
    expect(result['3_fn_only.sql']).toBe('approval: drop function f');
  });

  it('ignores the same words inside comments', () => {
    const result = classify({ '1_comment.sql': '-- we used to drop table old here\ncreate table if not exists public.x (id int);' });
    expect(result['1_comment.sql']).toBe('additive');
  });
});
