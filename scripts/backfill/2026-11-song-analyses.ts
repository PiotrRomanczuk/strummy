#!/usr/bin/env tsx
/**
 * Song-analysis backfill — load song2logic analyses into `song_analyses` and fill the EMPTY tempo,
 * time_signature, chords and youtube_url of the analysed songs (rules: song-analyses-core.ts).
 *
 * Usage:
 *   npx tsx scripts/backfill/2026-11-song-analyses.ts --dir <run dir> --validateOnly
 *   npx tsx scripts/backfill/2026-11-song-analyses.ts --dir <run dir> --commit
 *
 * <run dir> comes from song2logic's `research/strummy_batch.py` (`results-*.jsonl`, `analysis/<song id>.json`).
 * Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY from the shell, then `.env.local`.
 * --commit against anything but localhost also needs --remote.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import {
  analysisRow,
  mergeFilledFields,
  planFill,
  type AnalysisSource,
  type SongAnalysisDocument,
  type SongFill,
  type SongRow,
} from './song-analyses-core';

interface Options {
  dir: string;
  commit: boolean;
  remote: boolean;
}

interface Summary {
  analysed: number;
  failed: number;
  missingSong: number;
  durationMismatch: number;
  filled: Record<string, number>;
  keyAgreement: Record<string, number>;
}

const SONG_COLUMNS = 'id, key, tempo, time_signature, chords, youtube_url, duration_ms';

function parseArgs(argv: string[]): Options {
  const dirIndex = argv.indexOf('--dir');
  const dir = dirIndex >= 0 ? argv[dirIndex + 1] : undefined;
  const commit = argv.includes('--commit');
  if (!dir || commit === argv.includes('--validateOnly')) {
    console.error(
      'Usage: tsx scripts/backfill/2026-11-song-analyses.ts --dir <run dir> (--validateOnly | --commit) [--remote]'
    );
    process.exit(2);
  }
  return { dir, commit, remote: argv.includes('--remote') };
}

export function readSources(dir: string): AnalysisSource[] {
  const files = readdirSync(dir).filter((name) => /^results-\d+\.jsonl$/.test(name));
  return files.flatMap((name) =>
    readFileSync(join(dir, name), 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as AnalysisSource)
  );
}

async function applyOne(
  client: SupabaseClient,
  song: SongRow,
  row: ReturnType<typeof analysisRow>,
  fill: SongFill
) {
  const { error: upsertError } = await client
    .from('song_analyses')
    .upsert(row, { onConflict: 'song_id' });
  if (upsertError) throw new Error(`song_analyses ${song.id}: ${upsertError.message}`);
  if (Object.keys(fill).length === 0) return;
  const { error: updateError } = await client.from('songs').update(fill).eq('id', song.id);
  if (updateError) throw new Error(`songs ${song.id}: ${updateError.message}`);
}

export async function backfill(
  client: SupabaseClient,
  options: Pick<Options, 'dir' | 'commit'>
): Promise<Summary> {
  const summary: Summary = {
    analysed: 0,
    failed: 0,
    missingSong: 0,
    durationMismatch: 0,
    filled: {},
    keyAgreement: {},
  };
  for (const source of readSources(options.dir)) {
    if (source.error) {
      summary.failed += 1;
      continue;
    }
    const { data: song, error } = await client
      .from('songs')
      .select(SONG_COLUMNS)
      .eq('id', source.id)
      .maybeSingle();
    if (error) throw new Error(`songs ${source.id}: ${error.message}`);
    if (!song) {
      summary.missingSong += 1;
      continue;
    }
    const document = JSON.parse(
      readFileSync(join(options.dir, 'analysis', `${source.id}.json`), 'utf8')
    );
    const analysis = document as SongAnalysisDocument;
    const fill = planFill(song as SongRow, analysis, source);
    const row = analysisRow(song as SongRow, analysis, source, fill);
    const { data: earlier } = await client
      .from('song_analyses')
      .select('filled_fields')
      .eq('song_id', source.id)
      .maybeSingle();
    row.filled_fields = mergeFilledFields(earlier?.filled_fields, row.filled_fields);
    summary.analysed += 1;
    if (row.duration_matches !== true) summary.durationMismatch += 1;
    for (const field of Object.keys(fill)) summary.filled[field] = (summary.filled[field] ?? 0) + 1;
    const agreement = row.key_agreement ?? 'song has no key';
    summary.keyAgreement[agreement] = (summary.keyAgreement[agreement] ?? 0) + 1;
    if (options.commit) await applyOne(client, song as SongRow, row, fill);
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
