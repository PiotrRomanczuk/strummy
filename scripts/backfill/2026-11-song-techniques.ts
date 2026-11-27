#!/usr/bin/env tsx
/**
 * Song-techniques backfill (#1206) — load per-song technique counts (JSONL, one line per song) into
 * `song_techniques`, upserting on `song_id` (rules: song-techniques-core.ts).
 *
 * Usage:
 *   npx tsx scripts/backfill/2026-11-song-techniques.ts --file <jsonl> --validateOnly
 *   npx tsx scripts/backfill/2026-11-song-techniques.ts --file <jsonl> --commit [--remote]
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY from the shell, then
 * `.env.local`. --commit against anything but localhost also needs --remote.
 */
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { parseTechniqueLine, planTechniques } from './song-techniques-core';

interface Options {
  file: string;
  commit: boolean;
  remote: boolean;
}

interface Summary {
  lines: number;
  loaded: number;
  skipped: Record<string, number>;
  problems: string[];
}

function parseArgs(argv: string[]): Options {
  const fileIndex = argv.indexOf('--file');
  const file = fileIndex >= 0 ? argv[fileIndex + 1] : undefined;
  const commit = argv.includes('--commit');
  if (!file || commit === argv.includes('--validateOnly')) {
    console.error(
      'Usage: tsx scripts/backfill/2026-11-song-techniques.ts --file <jsonl> (--validateOnly | --commit) [--remote]'
    );
    process.exit(2);
  }
  return { file, commit, remote: argv.includes('--remote') };
}

const count = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

export async function backfill(
  client: SupabaseClient,
  options: Pick<Options, 'file' | 'commit'>
): Promise<Summary> {
  const summary: Summary = { lines: 0, loaded: 0, skipped: {}, problems: [] };
  const texts = readFileSync(options.file, 'utf8').split('\n');
  for (const [index, text] of texts.entries()) {
    if (!text.trim()) continue;
    summary.lines += 1;
    const { line, problem } = parseTechniqueLine(text, index + 1);
    if (!line) {
      count(summary.skipped, 'invalid');
      summary.problems.push(problem);
      continue;
    }
    const { data: song, error } = await client
      .from('songs')
      .select('id, deleted_at')
      .eq('id', line.song_id)
      .maybeSingle();
    if (error) throw new Error(`songs ${line.song_id}: ${error.message}`);
    const planned = planTechniques(line, song);
    if (planned.skip) {
      count(summary.skipped, planned.skip);
      summary.problems.push(planned.problem);
      continue;
    }
    summary.loaded += 1;
    if (!options.commit) continue;
    const { error: upsertError } = await client
      .from('song_techniques')
      .upsert(planned.row, { onConflict: 'song_id' });
    if (upsertError) throw new Error(`song_techniques ${line.song_id}: ${upsertError.message}`);
  }
  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnv({ path: '.env.local' });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const isLocal = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  if (options.commit && !isLocal && !options.remote) {
    console.error(`Refusing to write to ${url} without --remote.`);
    process.exit(2);
  }
  console.log(`${options.commit ? 'Writing to' : 'Validating against'} ${url}`);
  const client = createClient(url, key, { auth: { persistSession: false } });
  const summary = await backfill(client, options);
  console.log(JSON.stringify(summary, null, 2));
  if (!options.commit)
    console.log('Validate-only run — no rows changed. Re-run with --commit to apply.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
