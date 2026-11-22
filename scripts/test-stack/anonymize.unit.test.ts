/**
 * The anonymisation rules must classify every column the database has.
 *
 * Reads the generated `database.types.ts` (the schema the code compiles
 * against), so a migration that adds a column fails here until someone
 * decides what the StrummyTest copy does with it — instead of the column
 * silently reaching the test database with real data in it.
 */
import { readFileSync } from 'node:fs';
import {
  buildAnonymizeSql,
  expressionFor,
  plan,
  TEST_EMAIL_DOMAIN,
  unclassified,
  type Rules,
} from './anonymize';

const rules = JSON.parse(readFileSync('scripts/test-stack/anonymize.rules.json', 'utf8')) as Rules;
const authSql = readFileSync('scripts/test-stack/anonymize-auth.sql', 'utf8');

/** public.Tables → columns, from the generated types file. */
function schemaFromTypes(): Record<string, string[]> {
  const src = readFileSync('database.types.ts', 'utf8');
  const pub = src.slice(src.indexOf('  public: {'));
  const tables = pub.slice(pub.indexOf('Tables: {'), pub.indexOf('Views: {'));
  const out: Record<string, string[]> = {};
  for (const m of tables.matchAll(/\n {6}([a-z_0-9]+): \{\n {8}Row: \{([\s\S]*?)\n {8}\}/g)) {
    out[m[1]] = [...m[2].matchAll(/\n {10}([a-z_0-9]+)\??: /g)].map((c) => c[1]);
  }
  return out;
}

describe('StrummyTest anonymisation rules', () => {
  const schema = schemaFromTypes();

  it('reads the schema from database.types.ts', () => {
    expect(Object.keys(schema).length).toBeGreaterThan(50);
    expect(schema.profiles).toContain('email');
  });

  it('classifies every column of every public table', () => {
    expect(unclassified(rules, schema)).toEqual([]);
  });

  it('lists no column or table the schema does not have', () => {
    const stale: string[] = [];
    for (const [table, rule] of Object.entries(rules.tables)) {
      if (!schema[table]) stale.push(`${table}.*`);
      else if (!('truncate' in rule)) {
        for (const c of Object.values(rule).flat())
          if (!schema[table].includes(c)) stale.push(`${table}.${c}`);
      }
    }
    expect(stale).toEqual([]);
  });

  it('wipes credentials and leads, and rewrites personal columns', () => {
    const { truncate, updates } = plan(rules);
    expect(truncate).toEqual(
      expect.arrayContaining(['user_integrations', 'api_keys', 'teacher_leads'])
    );
    const profiles = updates.find((u) => u.table === 'profiles')?.sets.join('\n') ?? '';
    for (const c of ['email', 'invite_email', 'parent_email', 'full_name', 'phone', 'notes']) {
      expect(profiles).toContain(`"${c}" =`);
    }
    expect(profiles).not.toContain('"user_id" =');
    expect(profiles).toContain(`@${TEST_EMAIL_DOMAIN}`);
  });

  it('builds one transaction with triggers off and the auth part inside it', () => {
    const sql = buildAnonymizeSql(rules, authSql);
    expect(sql.indexOf('BEGIN;')).toBeLessThan(sql.indexOf('session_replication_role = replica'));
    expect(sql.indexOf("extensions.crypt(:'test_password'")).toBeLessThan(
      sql.lastIndexOf('COMMIT;')
    );
    expect(sql).toContain('RAISE EXCEPTION');
  });

  it('keeps nulls null and the text length of free text', () => {
    expect(expressionFor('text', 'notes')).toMatch(/^CASE WHEN "notes" IS NULL THEN NULL/);
    expect(expressionFor('text', 'notes')).toContain('greatest(length("notes"), 1)');
    expect(expressionFor('keep', 'id')).toBeNull();
    // Found on a copy of the dev database: an untyped '{}' inside CASE is text.
    expect(expressionFor('json', 'changes')).toContain("'{}'::jsonb");
  });

  it('refuses unknown actions, unsafe identifiers and hashing without an id column', () => {
    expect(() => plan({ partitions: {}, tables: { t: { shout: ['a'] } as never } })).toThrow(
      /unknown action/
    );
    expect(() => plan({ partitions: {}, tables: { t: { text: ['a"; drop'] } } })).toThrow(/unsafe/);
    expect(() => plan({ partitions: {}, tables: { t: { name: ['who'], keep: ['x'] } } })).toThrow(
      /needs an id/
    );
  });

  it('treats audit_log partitions as their parent', () => {
    expect(
      unclassified(rules, { audit_log_2026_11: ['changes', 'id'], audit_log_default: ['id'] })
    ).toEqual([]);
  });
});
