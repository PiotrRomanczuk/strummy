#!/usr/bin/env tsx

/**
 * Import the @JustMeAndGuitars song catalogue (docs/marketing/tiktok/songs.yaml)
 * into public.songs, and clear the fake @strummyapp TikTok placeholder URLs.
 *
 *   npx tsx scripts/database/seeding/import-jmg-songs.ts --target dev            # dry run (default)
 *   npx tsx scripts/database/seeding/import-jmg-songs.ts --target dev --apply    # write to DEV
 *   JMG_IMPORT_DB_URL=postgresql://…:54322/postgres \
 *     npx tsx scripts/database/seeding/import-jmg-songs.ts --target prod --backup <dump> --apply
 *
 * DB URL: JMG_IMPORT_DB_URL, else POSTGRES_URL from .env.local. The guard
 * refuses unless the URL matches the named target (import-jmg-songs.guard.ts).
 * Idempotent: a second --apply plans 0 inserts / 0 updates.
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { parse } from 'yaml';
import { assertClusterIdentity, assertTarget, maskDbUrl } from './import-jmg-songs.guard';
import {
  planImport,
  type ExistingSong,
  type ImportPlan,
  type JmgSong,
  type SongPatch,
} from './import-jmg-songs.helpers';

config({ path: path.join(process.cwd(), '.env.local'), quiet: true });

const DEFAULT_FILE = path.join(process.cwd(), 'docs', 'marketing', 'tiktok', 'songs.yaml');
const PATCH_COLUMNS: (keyof SongPatch)[] = [
  'level',
  'category',
  'priority_bucket',
  'tiktok_short_url',
];

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadCatalogue(file: string): JmgSong[] {
  const parsed: unknown = parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${file}: expected a YAML list of songs`);
  return parsed.map((row, i) => {
    const r = row as Record<string, unknown>;
    if (typeof r.title !== 'string' || typeof r.artist !== 'string') {
      throw new Error(`${file}: entry #${i + 1} is missing title/artist`);
    }
    return r as unknown as JmgSong;
  });
}

async function counts(db: Client): Promise<Record<string, string>> {
  const { rows } = await db.query(`select
      count(*) filter (where deleted_at is null)                          as active_songs,
      count(*) filter (where priority_bucket is not null)                 as with_bucket,
      count(*) filter (where tiktok_short_url ~* 'tiktok\\.com/@strummyapp/video/') as placeholder_urls
    from public.songs`);
  return rows[0];
}

function printPlan(plan: ImportPlan): void {
  for (const s of plan.inserts) {
    console.log(
      `  + INSERT ${s.title} — ${s.author} [${s.level}, ${s.priority_bucket}, ${s.category ?? '-'}]`
    );
  }
  for (const u of plan.updates) {
    console.log(
      `  ~ UPDATE ${u.title} — ${u.author ?? '?'} (${u.reason}) ${JSON.stringify(u.set)}`
    );
  }
  if (plan.yamlDuplicates.length)
    console.log(`  ! YAML duplicates collapsed: ${plan.yamlDuplicates.join('; ')}`);
  console.log(
    `\nPlan: ${plan.inserts.length} inserts, ${plan.updates.length} updates ` +
      `(${plan.updates.filter((u) => u.reason === 'placeholder-url').length} placeholder-only), ` +
      `${plan.unchanged} already up to date`
  );
}

async function apply(db: Client, plan: ImportPlan): Promise<void> {
  await db.query('begin');
  try {
    for (const s of plan.inserts) {
      await db.query(
        `insert into public.songs (title, author, level, category, priority_bucket, tiktok_short_url)
         values ($1, $2, $3::public.difficulty_level, $4, $5, null)`,
        [s.title, s.author, s.level, s.category, s.priority_bucket]
      );
    }
    for (const u of plan.updates) {
      const cols = PATCH_COLUMNS.filter((c) => c in u.set);
      const assignments = cols.map((c, i) =>
        c === 'level' ? `level = $${i + 2}::public.difficulty_level` : `${c} = $${i + 2}`
      );
      await db.query(`update public.songs set ${assignments.join(', ')} where id = $1`, [
        u.id,
        ...cols.map((c) => u.set[c] ?? null),
      ]);
    }
    await db.query('commit');
  } catch (error: unknown) {
    await db.query('rollback');
    throw error;
  }
}

async function main(): Promise<void> {
  const isApply = process.argv.includes('--apply');
  const dbUrl = process.env.JMG_IMPORT_DB_URL ?? process.env.POSTGRES_URL;
  const target = assertTarget({
    target: argValue('--target'),
    dbUrl,
    backupPath: argValue('--backup'),
  });
  const songs = loadCatalogue(argValue('--file') ?? DEFAULT_FILE);
  console.log(
    `Target: ${target.toUpperCase()} (${maskDbUrl(dbUrl as string)}) — ${isApply ? 'APPLY' : 'DRY RUN'}`
  );
  console.log(`Catalogue: ${songs.length} YAML entries\n`);

  const db = new Client({ connectionString: dbUrl });
  await db.connect();
  try {
    const { rows: id } = await db.query<{ sid: string }>(
      'select system_identifier::text as sid from pg_control_system()'
    );
    assertClusterIdentity(target, id[0].sid);
    console.log(`Cluster identity verified: ${target.toUpperCase()} (${id[0].sid})\n`);
    const before = await counts(db);
    const { rows } = await db.query<ExistingSong>(
      'select id, title, author, level::text as level, category, priority_bucket, tiktok_short_url, deleted_at from public.songs'
    );
    const plan = planImport(songs, rows);
    printPlan(plan);
    console.log('Before:', before);
    if (!isApply) return console.log('\nDry run — nothing written. Re-run with --apply to write.');
    await apply(db, plan);
    console.log('After: ', await counts(db));
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
