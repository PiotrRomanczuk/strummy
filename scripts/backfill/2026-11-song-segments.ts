#!/usr/bin/env tsx
/**
 * Song-segments backfill (SNG-16) — load song2logic `strummy-segments` files (a song part by part) into
 * `song_segments`, one row per song (rules: song-segments-core.ts).
 *
 * Usage:
 *   npx tsx scripts/backfill/2026-11-song-segments.ts --dir <run dir> --validateOnly
 *   npx tsx scripts/backfill/2026-11-song-segments.ts --dir <run dir> --commit
 *
 * <run dir> comes from `song2logic strummy-segments <songs.jsonl> <run dir>` (`results.jsonl`,
 * `segments/<song id>.json`). Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) +
 * SUPABASE_SERVICE_ROLE_KEY from the shell, then `.env.local`. --commit against anything but localhost
 * also needs --remote.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { planSegments, type SegmentsResultLine } from './song-segments-core';
import type { SongRow } from './song-transcriptions-core';

interface Options {
  dir: string;
  commit: boolean;
  remote: boolean;
}

interface Summary {
  loaded: number;
  parts: number;
  missingSong: number;
  skipped: Record<string, number>;
  problems: string[];
}

function parseArgs(argv: string[]): Options {
  const dirIndex = argv.indexOf('--dir');
  const dir = dirIndex >= 0 ? argv[dirIndex + 1] : undefined;
  const commit = argv.includes('--commit');
  if (!dir || commit === argv.includes('--validateOnly')) {
    console.error(
      'Usage: tsx scripts/backfill/2026-11-song-segments.ts --dir <run dir> (--validateOnly | --commit) [--remote]'
    );
    process.exit(2);
  }
  return { dir, commit, remote: argv.includes('--remote') };
}

export function readResults(dir: string): SegmentsResultLine[] {
  return readFileSync(join(dir, 'results.jsonl'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as SegmentsResultLine);
}

const count = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

export async function backfill(
  client: SupabaseClient,
  options: Pick<Options, 'dir' | 'commit'>
): Promise<Summary> {
  const summary: Summary = { loaded: 0, parts: 0, missingSong: 0, skipped: {}, problems: [] };
  for (const line of readResults(options.dir)) {
    if (line.status !== 'ok') {
      count(summary.skipped, line.status);
      continue;
    }
    const { data: song, error } = await client
      .from('songs')
      .select('id, youtube_url, deleted_at')
      .eq('id', line.id)
      .maybeSingle();
    if (error) throw new Error(`songs ${line.id}: ${error.message}`);
    if (!song) {
      summary.missingSong += 1;
      continue;
    }
    const file = JSON.parse(readFileSync(join(options.dir, 'segments', `${line.id}.json`), 'utf8'));
    const planned = planSegments(line, file, song as SongRow);
    if (planned.skip) {
      count(summary.skipped, planned.skip);
      summary.problems.push(planned.problem);
      continue;
    }
    summary.loaded += 1;
    summary.parts += planned.row.part_count;
    if (!options.commit) continue;
    const { error: upsertError } = await client
      .from('song_segments')
      .upsert(planned.row, { onConflict: 'song_id' });
    if (upsertError) throw new Error(`song_segments ${line.id}: ${upsertError.message}`);
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
