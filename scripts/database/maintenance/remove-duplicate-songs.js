/**
 * Merge duplicate songs (same title + author) into one surviving row.
 *
 * The previous version of this script hard-deleted duplicates by title
 * alone, with no foreign-key repointing first. That's actively dangerous:
 * several tables referencing songs.id are ON DELETE CASCADE (lesson_songs,
 * student_repertoire, content_posts, song_of_the_week, song_status_history,
 * song_videos, spotify_matches) — a naive delete would silently destroy
 * real lesson/repertoire/history data instead of just removing the
 * duplicate catalogue entry. It also grouped by title only, which would
 * wrongly merge two different artists' same-titled songs.
 *
 * This version:
 *  - groups by normalized (title, author) so different artists never collide
 *  - keeps the oldest row per group as the survivor
 *  - repoints every table with a song_id foreign key onto the survivor
 *    BEFORE touching the duplicate rows
 *  - for tables with a unique constraint that includes song_id
 *    (lesson_songs, student_repertoire, content_posts, spotify_matches),
 *    repoints where possible and otherwise deletes the now-redundant
 *    duplicate-referencing row (the survivor already covers that slot)
 *  - soft-deletes duplicates (sets deleted_at) instead of hard-deleting —
 *    consistent with the app's soft-delete convention elsewhere
 *  - defaults to a dry run; pass --execute to actually write
 *
 * Usage:
 *   node scripts/database/maintenance/remove-duplicate-songs.js            # dry run, prints the plan
 *   node scripts/database/maintenance/remove-duplicate-songs.js --execute  # applies it
 */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const DRY_RUN = !process.argv.includes('--execute');

// Tables with a UNIQUE constraint that includes song_id — repoint can hit a
// conflict if the survivor is already referenced under the same other key.
// { table, songCol, conflictCols: other columns in the unique key }
const CONFLICT_SAFE_TABLES = [
  { table: 'lesson_songs', songCol: 'song_id', conflictCols: ['lesson_id'] },
  { table: 'student_repertoire', songCol: 'song_id', conflictCols: ['student_id'] },
  { table: 'content_posts', songCol: 'song_id', conflictCols: ['platform', 'scheduled_at'] },
  { table: 'spotify_matches', songCol: 'song_id', conflictCols: ['track_id', 'status'] },
];

// Plain FK tables — a simple UPDATE song_id can never conflict.
const SIMPLE_TABLES = [
  'apple_shortcut_song_import_log',
  'assignments',
  'practice_sessions',
  'song_of_the_week',
  'song_requests',
  'song_status_history',
  'song_videos',
];

function normalize(value) {
  return (value ?? '').trim().toLowerCase();
}

async function findDuplicateGroups() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, author, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch songs: ${error.message}`);

  const groups = new Map();
  for (const song of songs) {
    const key = `${normalize(song.title)}::${normalize(song.author)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

async function repointConflictSafe(table, songCol, conflictCols, survivorId, duplicateId) {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${conflictCols.join(', ')}`)
    .eq(songCol, duplicateId);
  if (error)
    throw new Error(`Failed to read ${table} for duplicate ${duplicateId}: ${error.message}`);
  if (!rows || rows.length === 0) return { repointed: 0, dropped: 0 };

  let repointed = 0;
  let dropped = 0;

  for (const row of rows) {
    const conflictFilter = {};
    for (const col of conflictCols) conflictFilter[col] = row[col];

    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select('id')
      .eq(songCol, survivorId)
      .match(conflictFilter)
      .maybeSingle();
    if (existingError)
      throw new Error(`Failed conflict check on ${table}: ${existingError.message}`);

    if (existing) {
      // Survivor already covers this slot — the duplicate-referencing row is redundant.
      if (!DRY_RUN) {
        const { error: deleteError } = await supabase.from(table).delete().eq('id', row.id);
        if (deleteError)
          throw new Error(`Failed to drop redundant ${table} row: ${deleteError.message}`);
      }
      dropped++;
    } else {
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from(table)
          .update({ [songCol]: survivorId })
          .eq('id', row.id);
        if (updateError) throw new Error(`Failed to repoint ${table} row: ${updateError.message}`);
      }
      repointed++;
    }
  }

  return { repointed, dropped };
}

async function repointSimple(table, survivorId, duplicateId) {
  const { data: rows, error: countError } = await supabase
    .from(table)
    .select('id')
    .eq('song_id', duplicateId);
  if (countError)
    throw new Error(`Failed to read ${table} for duplicate ${duplicateId}: ${countError.message}`);
  const count = rows?.length ?? 0;
  if (count === 0) return 0;

  if (!DRY_RUN) {
    const { error } = await supabase
      .from(table)
      .update({ song_id: survivorId })
      .eq('song_id', duplicateId);
    if (error) throw new Error(`Failed to repoint ${table}: ${error.message}`);
  }
  return count;
}

async function mergeDuplicateGroup(group) {
  const [survivor, ...duplicates] = group;
  console.log(
    `\n"${survivor.title}" by ${survivor.author || '(no author)'} — ${group.length} copies`
  );
  console.log(`  keep: ${survivor.id} (created ${survivor.created_at})`);

  for (const duplicate of duplicates) {
    console.log(`  merge: ${duplicate.id} (created ${duplicate.created_at}) → ${survivor.id}`);

    for (const table of SIMPLE_TABLES) {
      const count = await repointSimple(table, survivor.id, duplicate.id);
      if (count > 0)
        console.log(`    ${DRY_RUN ? 'would repoint' : 'repointed'} ${count} row(s) in ${table}`);
    }

    for (const { table, songCol, conflictCols } of CONFLICT_SAFE_TABLES) {
      const { repointed, dropped } = await repointConflictSafe(
        table,
        songCol,
        conflictCols,
        survivor.id,
        duplicate.id
      );
      if (repointed > 0)
        console.log(
          `    ${DRY_RUN ? 'would repoint' : 'repointed'} ${repointed} row(s) in ${table}`
        );
      if (dropped > 0)
        console.log(
          `    ${DRY_RUN ? 'would drop' : 'dropped'} ${dropped} redundant row(s) in ${table} (survivor already covers that slot)`
        );
    }

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('songs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', duplicate.id);
      if (error)
        throw new Error(`Failed to soft-delete duplicate ${duplicate.id}: ${error.message}`);
    }
    console.log(`    ${DRY_RUN ? 'would soft-delete' : 'soft-deleted'} ${duplicate.id}`);
  }
}

async function main() {
  console.log(
    DRY_RUN
      ? '🔍 Dry run — no writes will be made. Pass --execute to apply.'
      : '⚠️  Executing — this will write to the database.'
  );

  const groups = await findDuplicateGroups();
  if (groups.length === 0) {
    console.log('✅ No duplicate (title, author) groups found.');
    return;
  }

  console.log(
    `Found ${groups.length} duplicate group(s), ${groups.reduce((n, g) => n + g.length - 1, 0)} extra row(s) total.`
  );

  for (const group of groups) {
    await mergeDuplicateGroup(group);
  }

  console.log(
    DRY_RUN ? '\n🔍 Dry run complete. Re-run with --execute to apply.' : '\n✨ Cleanup complete.'
  );
}

main().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
