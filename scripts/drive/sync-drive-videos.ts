#!/usr/bin/env tsx

/**
 * Sync Google Drive "07_Guitar Videos" folder to song_videos table.
 *
 * Usage:
 *   npx tsx scripts/drive/sync-drive-videos.ts                     # Dry run, local DB
 *   npx tsx scripts/drive/sync-drive-videos.ts --execute            # Insert, local DB
 *   npx tsx scripts/drive/sync-drive-videos.ts --remote             # Dry run, remote DB
 *   npx tsx scripts/drive/sync-drive-videos.ts --execute --remote   # Insert, remote DB
 *   npx tsx scripts/drive/sync-drive-videos.ts --folder-id=XXXX     # Use direct folder ID
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { syncDriveVideosToSongs } from '../../lib/services/drive-video-sync';
import { VideoMatchResult } from '../../lib/services/drive-video-matcher';

config({ path: path.join(process.cwd(), '.env.local') });

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function getClient(useRemote: boolean) {
  if (useRemote) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Missing remote Supabase credentials in .env.local');
      process.exit(1);
    }
    console.log('Targeting REMOTE database\n');
    return createClient(url, key);
  }
  console.log('Targeting LOCAL database\n');
  return createClient(LOCAL_URL, LOCAL_SERVICE_KEY);
}

async function getAdminUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .single();

  if (!data?.id) {
    console.error('No admin user found in profiles table');
    process.exit(1);
  }
  return data.id;
}

const COLOR = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function statusColor(status: string): (s: string) => string {
  if (status === 'matched') return COLOR.green;
  if (status === 'review_queue') return COLOR.yellow;
  return COLOR.red;
}

function printResults(results: VideoMatchResult[]) {
  const colFile = 40;
  const colMatch = 35;
  const colScore = 6;
  const colStatus = 10;

  const header =
    'Filename'.padEnd(colFile) +
    'Best Match'.padEnd(colMatch) +
    'Score'.padEnd(colScore) +
    'Status'.padEnd(colStatus);

  console.log(COLOR.bold(header));
  console.log('-'.repeat(colFile + colMatch + colScore + colStatus));

  for (const r of results) {
    const filename =
      r.driveFile.name.length > colFile - 2
        ? r.driveFile.name.slice(0, colFile - 5) + '...'
        : r.driveFile.name;

    const matchStr = r.bestMatch
      ? `${r.bestMatch.song.title} - ${r.bestMatch.song.author}`
      : '(no match)';
    const match =
      matchStr.length > colMatch - 2 ? matchStr.slice(0, colMatch - 5) + '...' : matchStr;

    const score = r.bestMatch ? String(r.bestMatch.score) : '-';
    const colorFn = statusColor(r.status);

    console.log(
      filename.padEnd(colFile) +
        match.padEnd(colMatch) +
        score.padEnd(colScore) +
        colorFn(r.status.padEnd(colStatus))
    );
  }
}

async function main() {
  console.log('DRIVE VIDEO SYNC');
  console.log('================\n');

  const args = process.argv.slice(2);
  const useRemote = args.includes('--remote');
  const execute = args.includes('--execute');
  const folderIdArg = args.find((a) => a.startsWith('--folder-id='));
  const folderId = folderIdArg?.split('=')[1];

  if (!execute) {
    console.log(COLOR.yellow('DRY RUN MODE — no data will be inserted\n'));
  } else {
    console.log(COLOR.green('EXECUTE MODE — matched videos will be inserted\n'));
  }

  const supabase = getClient(useRemote);
  const userId = await getAdminUserId(supabase);
  console.log(`Using admin user: ${COLOR.dim(userId)}\n`);

  const result = await syncDriveVideosToSongs({
    folderId,
    dryRun: !execute,
    uploadedByUserId: userId,
    supabase,
  });

  console.log(`\nFound ${result.totalFiles} video files in Drive folder`);
  console.log(`Skipped ${result.skipped} already-synced files`);
  console.log(`Processing ${result.results.length} new files...\n`);

  printResults(result.results);

  console.log('\n--- Summary ---');
  console.log(COLOR.green(`  Matched:   ${result.matched}`));
  console.log(COLOR.yellow(`  Review:    ${result.reviewQueue}`));
  console.log(COLOR.red(`  Unmatched: ${result.unmatched}`));
  console.log(`  Skipped:   ${result.skipped}`);

  if (execute) {
    console.log(COLOR.green(`\n  Inserted: ${result.inserted} rows into song_videos`));
  } else {
    console.log(COLOR.dim('\nRun with --execute to insert matched videos into the database'));
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
