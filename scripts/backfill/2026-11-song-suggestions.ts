#!/usr/bin/env tsx
/**
 * Song suggestions (SNG-15) — ask a model for a missing genre, level or artist and save the answers as open
 * proposals in `song_suggestions`. Nothing reaches `songs`: an admin accepts or rejects each proposal in Repertoire
 * Stats → Data quality. Runs on a home machine (the Mac or uwh), never in the app:
 *
 *   npx tsx scripts/backfill/2026-11-song-suggestions.ts --field category --model claude --dry-run
 *   npx tsx scripts/backfill/2026-11-song-suggestions.ts --field all --model local --commit
 *
 * --model claude: Claude Code headless (`claude -p`, signed-in subscription); --model local: Ollama
 * (OLLAMA_BASE_URL). --limit caps the songs per field. Reads NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) +
 * SUPABASE_SERVICE_ROLE_KEY from the shell, then `.env.local`; --commit against anything but localhost also needs
 * --remote.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

import { SUGGEST_FIELDS, type SuggestField } from '@/lib/song-suggestions/fields';
import { BATCH_SIZE, suggestBatch } from '@/lib/song-suggestions/generate';
import { savePending, songsToAsk } from '@/lib/services/song-suggestions';

import { modelFor, type ModelKind } from './song-suggestions-models';

interface Options {
  fields: SuggestField[];
  model: ModelKind;
  limit: number;
  commit: boolean;
  remote: boolean;
}

const USAGE =
  'Usage: tsx scripts/backfill/2026-11-song-suggestions.ts --field <category|level|author|all> --model <claude|local> (--dry-run | --commit) [--limit N] [--remote]';

const valueOf = (argv: string[], flag: string) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

export function parseArgs(argv: string[]): Options | null {
  const field = valueOf(argv, '--field');
  const model = valueOf(argv, '--model');
  const commit = argv.includes('--commit');
  const fields = field === 'all' ? [...SUGGEST_FIELDS] : SUGGEST_FIELDS.filter((f) => f === field);
  if (fields.length === 0 || (model !== 'claude' && model !== 'local')) return null;
  if (commit === argv.includes('--dry-run')) return null;
  const limit = Number(valueOf(argv, '--limit') ?? Infinity);
  return {
    fields,
    model,
    limit: Number.isFinite(limit) && limit > 0 ? limit : Infinity,
    commit,
    remote: argv.includes('--remote'),
  };
}

interface FieldSummary {
  asked: number;
  proposed: number;
  saved: number;
  errors: string[];
}

/** Walks the songs missing a field, batch by batch, and saves (or, in a dry run, prints) the proposals. */
export async function suggestField(
  client: SupabaseClient,
  field: SuggestField,
  options: Pick<Options, 'model' | 'limit' | 'commit'>
): Promise<FieldSummary> {
  const summary: FieldSummary = { asked: 0, proposed: 0, saved: 0, errors: [] };
  const { ask, source } = modelFor(options.model);
  let after: string | null = null;
  while (summary.asked < options.limit) {
    const size = Math.min(BATCH_SIZE, options.limit - summary.asked);
    const { songs } = await songsToAsk(client, field, after, size);
    if (songs.length === 0) break;
    const batch = await suggestBatch(field, songs, ask, source);
    summary.asked += songs.length;
    summary.proposed += batch.suggestions.length;
    if (batch.error) summary.errors.push(batch.error);
    for (const s of batch.suggestions) {
      const song = songs.find((candidate) => candidate.id === s.songId);
      console.log(
        `${field}\t${Math.round(s.confidence * 100)}%\t${song?.title} → ${s.value}\t${s.reason ?? ''}`
      );
    }
    if (options.commit) summary.saved += await savePending(client, batch.suggestions);
    after = songs[songs.length - 1].id;
  }
  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    console.error(USAGE);
    process.exit(2);
  }
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
  console.log(
    `${options.commit ? 'Writing proposals to' : 'Dry run against'} ${url} with ${options.model}`
  );
  const client = createClient(url, key, { auth: { persistSession: false } });
  for (const field of options.fields) {
    console.log(JSON.stringify({ field, ...(await suggestField(client, field, options)) }));
  }
  if (!options.commit)
    console.log('Dry run — nothing saved. Re-run with --commit to save the proposals.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
