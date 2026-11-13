#!/usr/bin/env tsx
/**
 * Song-analysis sources backfill — load a song2logic `chord-review` run into `song_analysis_sources`: per song its
 * chord review (`chord-compare`) and the Logic Chord ID result it used (`chord-id`). Nothing in `songs` changes.
 *
 * Usage:
 *   npx tsx scripts/backfill/2026-11-song-analysis-sources.ts --dir <run dir> --validateOnly
 *   npx tsx scripts/backfill/2026-11-song-analysis-sources.ts --dir <run dir> --commit [--remote]
 *
 * <run dir>: `song2logic chord-review` output — results.jsonl, sources/chord-compare/<song id>.json,
 * sources/chord-id/<song id>.json. Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * from the shell, then `.env.local`. --commit against anything but localhost also needs --remote.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { countPlan, planSong, type ReviewResultLine } from './song-analysis-sources-core';

interface Options {
  dir: string;
  commit: boolean;
  remote: boolean;
}

export interface Summary {
  songs: number;
  missingSong: number;
  counts: Record<string, number>;
  problems: string[];
}

function parseArgs(argv: string[]): Options {
  const dirIndex = argv.indexOf('--dir');
  const dir = dirIndex >= 0 ? argv[dirIndex + 1] : undefined;
  const commit = argv.includes('--commit');
  if (!dir || commit === argv.includes('--validateOnly')) {
    console.error(
      'Usage: tsx scripts/backfill/2026-11-song-analysis-sources.ts --dir <run dir> (--validateOnly | --commit) [--remote]'
    );
    process.exit(2);
  }
  return { dir, commit, remote: argv.includes('--remote') };
}

export function readResults(dir: string): ReviewResultLine[] {
  return readFileSync(join(dir, 'results.jsonl'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ReviewResultLine);
}

function readSource(dir: string, source: string, songId: string): unknown | undefined {
  const path = join(dir, 'sources', source, `${songId}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
}

export async function backfill(
  client: SupabaseClient,
  options: Pick<Options, 'dir' | 'commit'>
): Promise<Summary> {
  const summary: Summary = { songs: 0, missingSong: 0, counts: {}, problems: [] };
  for (const line of readResults(options.dir)) {
    const { data: song, error } = await client
      .from('songs')
      .select('id')
      .eq('id', line.id)
      .maybeSingle();
    if (error) throw new Error(`songs ${line.id}: ${error.message}`);
    if (!song) {
      summary.missingSong += 1;
      continue;
    }
    const review = readSource(options.dir, 'chord-compare', line.id);
    const planned = planSong(line, review, readSource(options.dir, 'chord-id', line.id));
    summary.songs += 1;
    countPlan(summary.counts, planned);
    if (planned.problem) summary.problems.push(planned.problem);
    if (!options.commit || planned.rows.length === 0) continue;
    const { error: upsertError } = await client
      .from('song_analysis_sources')
      .upsert(planned.rows, { onConflict: 'song_id,source' });
    if (upsertError) throw new Error(`song_analysis_sources ${line.id}: ${upsertError.message}`);
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
