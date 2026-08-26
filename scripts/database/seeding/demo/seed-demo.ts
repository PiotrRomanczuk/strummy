import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

import { DEMO_TEACHER_EMAIL } from '@/lib/demo/demo-accounts.constants';
import {
  ASSIGNMENTS_BY_STUDENT,
  DEMO_NOTIFICATIONS,
  DEMO_PASSWORD,
  DEMO_SONGS,
  DEMO_SONG_REQUESTS,
  DEMO_USERS,
  LESSON_SONGS_BY_STUDENT,
  PRACTICE_PLAN,
  SELF_RATINGS,
  SONG_OF_THE_WEEK,
  STUDENT_EMAILS,
  STUDENT_LESSONS,
  THIS_WEEK_SCHEDULE,
  lessonTitleFromNotes,
} from './demo-studio.data';

// Load .env.local explicitly
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

const REMOTE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!REMOTE_URL) {
  console.error(
    '❌ NEXT_PUBLIC_SUPABASE_URL is not set.\n' + '   Add it to .env.local and re-run.'
  );
  process.exit(1);
}

if (/127\.0\.0\.1|localhost/.test(REMOTE_URL)) {
  console.error(
    '❌ NEXT_PUBLIC_SUPABASE_URL points to localhost — aborting.\n' +
      '   This script targets the remote Supabase project only.'
  );
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
  process.exit(1);
}

const supabase = createClient(REMOTE_URL, SERVICE_ROLE_KEY);

/**
 * This script writes with the service-role key, bypassing RLS, against whatever
 * NEXT_PUBLIC_SUPABASE_URL resolves to — which may be a live stack serving real
 * users. Show the operator exactly which host is about to be written to and make
 * them type it back. `--yes` skips the prompt for scripted/scheduled reseeds.
 */
async function confirmTarget(): Promise<void> {
  const host = new URL(REMOTE_URL!).host;

  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    console.log(`⚠️  Target: ${host} (confirmation skipped via --yes)\n`);
    return;
  }

  console.log('⚠️  This writes demo users, songs, lessons and assignments using the');
  console.log('   SERVICE ROLE key (RLS bypassed). It DELETES existing lessons and');
  console.log('   assignments belonging to the demo students.\n');
  console.log(`   Target host: ${host}\n`);

  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type the host to confirm (${host}): `);
  rl.close();

  if (answer.trim() !== host) {
    console.error('\n❌ Host mismatch — aborting. Nothing was written.');
    process.exit(1);
  }
  console.log('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Every lesson card and list row leads with the lesson title, so seeding
 * untitled lessons made the whole demo read "Untitled lesson".
 *
 * Rather than authoring a second dataset in parallel with the notes (two
 * places to drift), derive the title from the note itself: these were written
 * headline-first — a short summary, then an em dash or full stop, then the
 * detail. Taking the opening clause yields exactly the title a teacher would
 * have typed ("Brown Eyed Girl verse progression", "Blackbird fingerpicking").
 */

function getWeekScheduleLessons(
  userIds: Record<string, string>,
  teacherId: string
): {
  teacher_id: string;
  student_id: string;
  status: string;
  scheduled_at: string;
  title: string;
  notes: string;
  lesson_teacher_number: number;
}[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();

  // Start of current week (Sunday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  return THIS_WEEK_SCHEDULE.map((l) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + l.dow);
    date.setHours(l.hour, 0, 0, 0);

    const isPast = l.dow < dayOfWeek || (l.dow === dayOfWeek && l.hour <= currentHour);

    return {
      teacher_id: teacherId,
      student_id: userIds[l.email],
      status: isPast ? 'COMPLETED' : 'SCHEDULED',
      scheduled_at: date.toISOString(),
      title: lessonTitleFromNotes(l.notes),
      notes: l.notes,
      lesson_teacher_number: 0, // trigger auto-sets this
    };
  });
}

async function getOrCreateUser(email: string, fullName: string): Promise<string> {
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      avatar_url: `https://i.pravatar.cc/150?u=${email}`,
      isDemo: true,
    },
  });

  if (!createErr) return createData.user.id;

  if (!/already (exists|been registered)/i.test(createErr.message)) {
    console.error(`  ❌ Failed to create ${email}:`, createErr.message);
    process.exit(1);
  }

  // User already exists — fetch their ID
  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    console.error('  ❌ Failed to list users:', listErr.message);
    process.exit(1);
  }
  const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error(`  ❌ User ${email} not found after creation attempt`);
    process.exit(1);
  }
  return existing.id;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎸 Demo Seed — Strummy Showcase\n' + '='.repeat(40));
  await confirmTarget();

  // ── Step 1: Create / get users + upsert profiles ──────────────────────────
  console.log('👤 Step 1: Users & profiles');
  const userIds: Record<string, string> = {};

  for (const user of DEMO_USERS) {
    const authId = await getOrCreateUser(user.email, user.fullName);

    // The handle_new_user trigger has already created this profile. Since
    // migration 20260727110000 ("S2") its id is an independent uuid linked by
    // user_id, NOT the auth id — so find it by user_id and update in place.
    // Upserting on { id: authId } inserts a SECOND row carrying the same
    // address and dies on profiles_email_key.
    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authId)
      .single();
    if (findErr || !profile?.id) {
      console.error(
        `  ❌ No profile for ${user.email}:`,
        findErr?.message ?? 'handle_new_user did not create one'
      );
      process.exit(1);
    }

    // Everything downstream (lessons, assignments, repertoire) FKs to
    // profiles.id, so the PROFILE id is what the rest of the seed needs.
    const profileId = profile.id as string;
    userIds[user.email] = profileId;

    const { error } = await supabase
      .from('profiles')
      .update({
        email: user.email,
        full_name: user.fullName,
        avatar_url: `https://i.pravatar.cc/150?u=${user.email}`,
        is_teacher: user.isTeacher,
        is_student: user.isStudent,
        is_admin: false,
        // Marks these as demo accounts, which is what gates them behind
        // guardTestAccountMutation.
        is_development: true,
      })
      .eq('id', profileId);
    if (error) {
      console.error(`  ❌ Profile update failed for ${user.email}:`, error.message);
      process.exit(1);
    }
    console.log(`  ✅ ${user.fullName} <${user.email}>`);
  }

  const teacherId = userIds[DEMO_TEACHER_EMAIL];
  const studentEmails = DEMO_USERS.filter((u) => u.isStudent).map((u) => u.email);
  const studentIds = studentEmails.map((e) => userIds[e]);

  // ── Step 2: Link songs (insert missing + fill only the gaps on existing) ───
  //
  // `songs` is one shared catalogue with no owner column, so a demo title can
  // collide with a song the teacher entered themselves. The previous version
  // matched on title and overwrote every field, which on the production
  // catalogue (500 songs, several duplicate "Wonderwall" rows, the oldest from
  // 2024) meant the demo silently rewrote real chords and lyrics.
  //
  // Now: never overwrite. Reuse the richest existing row as-is and fill only
  // the columns that are still NULL, so a sparse catalogue entry still gets
  // enough substance for the demo without touching anything a teacher typed.
  console.log('\n🎵 Step 2: Songs');
  const ENRICHABLE_COLUMNS = [
    'author',
    'level',
    'key',
    'tempo',
    'capo_fret',
    'chords',
    'strumming_pattern',
    'category',
    'release_year',
    'youtube_url',
    'spotify_link_url',
    'ultimate_guitar_link',
    'lyrics_with_chords',
  ] as const;

  type SongRow = Record<string, unknown> & { id: string; title: string };

  const songTitles = DEMO_SONGS.map((s) => s.title);
  const { data: existingSongs, error: fetchSongsErr } = await supabase
    .from('songs')
    .select(`id, title, ${ENRICHABLE_COLUMNS.join(', ')}`)
    .in('title', songTitles)
    .is('deleted_at', null);

  if (fetchSongsErr) {
    console.error('  ❌ Song fetch failed:', fetchSongsErr.message);
    process.exit(1);
  }

  // Several rows can share a title. Prefer the one already carrying the most
  // data — that is the teacher's real entry, and the one worth linking to.
  const filledCount = (row: SongRow) =>
    ENRICHABLE_COLUMNS.filter((c) => row[c] !== null && row[c] !== undefined).length;

  const bestByTitle: Record<string, SongRow> = {};
  for (const row of (existingSongs ?? []) as SongRow[]) {
    const current = bestByTitle[row.title];
    if (!current || filledCount(row) > filledCount(current)) bestByTitle[row.title] = row;
  }

  const songMap: Record<string, string> = {};
  let enrichedCount = 0;
  let reusedCount = 0;
  let insertedCount = 0;

  for (const song of DEMO_SONGS) {
    const existing = bestByTitle[song.title];

    if (!existing) {
      const { data: newSong, error: insertErr } = await supabase
        .from('songs')
        .insert(song)
        .select('id, title')
        .single();
      if (insertErr) {
        console.error(`  ❌ Song insert failed for "${song.title}":`, insertErr.message);
        process.exit(1);
      }
      songMap[song.title] = newSong.id;
      insertedCount++;
      continue;
    }

    songMap[song.title] = existing.id;

    // Gaps only: a column the catalogue already answers is left alone.
    const gapFill: Record<string, unknown> = {};
    for (const column of ENRICHABLE_COLUMNS) {
      const seeded = (song as Record<string, unknown>)[column];
      if (existing[column] === null && seeded !== null && seeded !== undefined) {
        gapFill[column] = seeded;
      }
    }

    if (Object.keys(gapFill).length === 0) {
      reusedCount++;
      continue;
    }

    const { error: updateErr } = await supabase.from('songs').update(gapFill).eq('id', existing.id);
    if (updateErr) {
      console.error(`  ❌ Song gap-fill failed for "${song.title}":`, updateErr.message);
      process.exit(1);
    }
    enrichedCount++;
  }

  const totalSongs = Object.keys(songMap).length;
  console.log(
    `  ✅ ${totalSongs} songs ready (${insertedCount} new, ${enrichedCount} gap-filled, ${reusedCount} reused untouched)`
  );

  // ── Step 3: Clean up existing demo data ───────────────────────────────────
  console.log('\n🧹 Step 3: Clearing existing demo data');
  await supabase.from('assignments').delete().in('student_id', studentIds);
  await supabase.from('lessons').delete().in('student_id', studentIds);
  console.log('  ✅ Previous demo lessons & assignments removed');

  // ── Step 4: Insert historical lessons ───────────────────────────────────────
  console.log('\n📅 Step 4: Historical lessons');
  let totalLessons = 0;
  const lessonIdsByStudent: Record<string, string[]> = {};

  for (const email of studentEmails) {
    const studentId = userIds[email];
    const completedNotes = STUDENT_LESSONS[email];
    const lessonsToInsert = [];

    // Completed lessons spread over the past weeks
    for (let i = 0; i < completedNotes.length; i++) {
      const weeksAgo = completedNotes.length - i;
      lessonsToInsert.push({
        teacher_id: teacherId,
        student_id: studentId,
        lesson_teacher_number: i + 1,
        status: 'COMPLETED',
        scheduled_at: daysFromNow(-(weeksAgo * 7)),
        title: lessonTitleFromNotes(completedNotes[i].notes),
        notes: completedNotes[i].notes,
      });
    }

    const { data: inserted, error: lessonErr } = await supabase
      .from('lessons')
      .insert(lessonsToInsert)
      .select('id, status');

    if (lessonErr) {
      console.error(`  ❌ Lessons insert failed for ${email}:`, lessonErr.message);
      process.exit(1);
    }
    const completedIds = (inserted ?? []).filter((l) => l.status === 'COMPLETED').map((l) => l.id);
    lessonIdsByStudent[email] = completedIds;
    totalLessons += inserted?.length ?? 0;
    console.log(`  ✅ ${email}: ${completedNotes.length} completed`);
  }

  // ── Step 4b: Insert this-week schedule ──────────────────────────────────────
  console.log("\n📆 Step 4b: This week's schedule");
  const weekLessons = getWeekScheduleLessons(userIds, teacherId);
  const { data: weekInserted, error: weekErr } = await supabase
    .from('lessons')
    .insert(weekLessons)
    .select('id, status');

  if (weekErr) {
    console.error('  ❌ This-week lessons insert failed:', weekErr.message);
    process.exit(1);
  }
  const weekCount = weekInserted?.length ?? 0;
  const completedThisWeek = (weekInserted ?? []).filter((l) => l.status === 'COMPLETED').length;
  const scheduledThisWeek = weekCount - completedThisWeek;
  totalLessons += weekCount;
  console.log(
    `  ✅ ${weekCount} lessons this week (${completedThisWeek} completed, ${scheduledThisWeek} scheduled)`
  );

  // ── Step 5: Insert lesson_songs ───────────────────────────────────────────
  console.log('\n🎼 Step 5: Lesson songs');
  const lessonSongsToInsert: object[] = [];

  for (const email of studentEmails) {
    const completedLessonIds = lessonIdsByStudent[email];
    const songsPerLesson = LESSON_SONGS_BY_STUDENT[email];

    for (let i = 0; i < completedLessonIds.length; i++) {
      const lessonId = completedLessonIds[i];
      const specs = songsPerLesson[i] ?? [];
      for (const spec of specs) {
        const songId = songMap[spec.title];
        if (!songId) continue;
        // No `notes` column on lesson_songs in the deployed schema — the
        // per-song narrative lives in the lesson's own notes field instead.
        lessonSongsToInsert.push({
          lesson_id: lessonId,
          song_id: songId,
          status: spec.status,
        });
      }
    }
  }

  const { data: insertedLS, error: lsErr } = await supabase
    .from('lesson_songs')
    .insert(lessonSongsToInsert)
    .select('id');

  if (lsErr) {
    console.error('  ❌ lesson_songs insert failed:', lsErr.message);
    process.exit(1);
  }
  const totalLessonSongs = insertedLS?.length ?? 0;
  console.log(`  ✅ ${totalLessonSongs} lesson_songs inserted`);

  // ── Step 6: Insert assignments ────────────────────────────────────────────
  console.log('\n📝 Step 6: Assignments');
  const assignmentsToInsert: object[] = [];

  for (const email of studentEmails) {
    const studentId = userIds[email];
    for (const a of ASSIGNMENTS_BY_STUDENT[email]) {
      assignmentsToInsert.push({
        teacher_id: teacherId,
        student_id: studentId,
        title: a.title,
        description: a.description,
        status: a.status,
        due_date: daysFromNow(a.dueDaysFromNow),
      });
    }
  }

  const { data: insertedA, error: aErr } = await supabase
    .from('assignments')
    .insert(assignmentsToInsert)
    .select('id');

  if (aErr) {
    console.error('  ❌ assignments insert failed:', aErr.message);
    process.exit(1);
  }
  const totalAssignments = insertedA?.length ?? 0;
  console.log(`  ✅ ${totalAssignments} assignments inserted`);

  // ── Step 7: Engagement data ───────────────────────────────────────────────
  // Practice history, self-ratings, notifications, song-of-the-week and song
  // requests. Without these the Practice, Repertoire and Notifications surfaces
  // render empty even though the core loop is fully populated.
  console.log('\n🔥 Step 7: Engagement data');

  // Idempotency: clear this demo cohort's engagement rows before re-inserting.
  await supabase.from('practice_sessions').delete().in('student_id', studentIds);
  await supabase.from('song_requests').delete().in('student_id', studentIds);
  await supabase
    .from('in_app_notifications')
    .delete()
    .in('profile_id', [...studentIds, teacherId]);

  // -- Practice sessions: 4 weeks of history, densest for Zosia --------------
  // `daysAgo` doubles as the streak driver — consecutive recent days read as an
  // active streak on the student dashboard.

  const practiceRows: object[] = [];
  for (const email of studentEmails) {
    const repertoireSongIds = (LESSON_SONGS_BY_STUDENT[email] ?? [])
      .flat()
      .map((s) => songMap[s.title])
      .filter(Boolean);

    for (const [i, p] of (PRACTICE_PLAN[email] ?? []).entries()) {
      const at = new Date();
      at.setDate(at.getDate() - p.daysAgo);
      at.setHours(17, 30, 0, 0);
      practiceRows.push({
        student_id: userIds[email],
        song_id: repertoireSongIds.length ? repertoireSongIds[i % repertoireSongIds.length] : null,
        duration_minutes: p.minutes,
        bpm_practiced: p.bpm ?? null,
        notes: p.note ?? null,
        created_at: at.toISOString(),
      });
    }
  }

  const { error: pErr } = await supabase.from('practice_sessions').insert(practiceRows);
  if (pErr) {
    console.error('  ❌ practice_sessions insert failed:', pErr.message);
    process.exit(1);
  }
  console.log(`  ✅ ${practiceRows.length} practice sessions`);

  // -- Repertoire self-ratings ----------------------------------------------
  // Rows themselves are created by the lesson_songs → repertoire trigger; this
  // only layers on the student-authored fields.

  let ratedCount = 0;
  for (const email of studentEmails) {
    const cfg = SELF_RATINGS[email];
    const { data: reps } = await supabase
      .from('student_repertoire')
      .select('id')
      .eq('student_id', userIds[email])
      .limit(3);

    for (const [i, r] of (reps ?? []).entries()) {
      const { error } = await supabase
        .from('student_repertoire')
        .update({
          self_rating: Math.max(1, cfg.rating - i),
          self_rating_updated_at: new Date().toISOString(),
          student_notes: i === 0 ? cfg.note : null,
        })
        .eq('id', r.id);
      if (!error) ratedCount++;
    }
  }
  console.log(`  ✅ ${ratedCount} repertoire self-ratings`);

  // -- In-app notifications --------------------------------------------------
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const notificationRows = DEMO_NOTIFICATIONS.map((n) => ({
    profile_id: n.recipient === 'teacher' ? teacherId : userIds[n.recipient],
    notification_type: n.type,
    title: n.title,
    body: n.body,
    priority: n.priority,
    is_read: n.isRead,
    ...(n.actionUrl ? { action_url: n.actionUrl } : {}),
    ...(n.actionLabel ? { action_label: n.actionLabel } : {}),
    ...(n.readHoursAgo !== undefined ? { read_at: hoursAgo(n.readHoursAgo) } : {}),
    created_at: hoursAgo(n.createdHoursAgo),
  }));

  const { error: nErr } = await supabase.from('in_app_notifications').insert(notificationRows);
  if (nErr) {
    console.error('  ❌ in_app_notifications insert failed:', nErr.message);
    process.exit(1);
  }
  console.log(`  ✅ ${notificationRows.length} in-app notifications`);

  // -- Song of the week ------------------------------------------------------
  // getCurrentSongOfTheWeek() uses maybeSingle() on is_active, so exactly one
  // active row may exist at a time.
  await supabase.from('song_of_the_week').update({ is_active: false }).eq('is_active', true);

  const sotwUntil = new Date();
  sotwUntil.setDate(sotwUntil.getDate() + SONG_OF_THE_WEEK.activeDays);
  const { error: sErr } = await supabase.from('song_of_the_week').insert({
    song_id: songMap[SONG_OF_THE_WEEK.songTitle],
    selected_by: teacherId,
    teacher_message: SONG_OF_THE_WEEK.teacherMessage,
    active_from: new Date().toISOString(),
    active_until: sotwUntil.toISOString(),
    is_active: true,
    category: 'student',
  });
  if (sErr) {
    console.error('  ❌ song_of_the_week insert failed:', sErr.message);
    process.exit(1);
  }
  console.log('  ✅ song of the week set');

  // -- Song requests ---------------------------------------------------------
  const { error: rErr } = await supabase.from('song_requests').insert(
    DEMO_SONG_REQUESTS.map((r) => ({
      student_id: userIds[r.student],
      title: r.title,
      artist: r.artist,
      ...(r.url ? { url: r.url } : {}),
      notes: r.notes,
      status: r.status,
      ...(r.reviewNotes ? { reviewed_by: teacherId, review_notes: r.reviewNotes } : {}),
      created_at: hoursAgo(r.createdHoursAgo),
    }))
  );
  if (rErr) {
    console.error('  ❌ song_requests insert failed:', rErr.message);
    process.exit(1);
  }
  console.log(`  ✅ ${DEMO_SONG_REQUESTS.length} song requests`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const pendingCount = Object.values(ASSIGNMENTS_BY_STUDENT)
    .flat()
    .filter((a) => ['not_started', 'in_progress', 'pending'].includes(a.status)).length;

  console.log('\n' + '='.repeat(40));
  console.log('✅ Demo seed complete!');
  console.log(`   👤 Users:            ${DEMO_USERS.length} (1 teacher, 4 students)`);
  console.log(`   🎵 Songs:            ${totalSongs}`);
  console.log(`   📅 Historical:       ${totalLessons - weekCount} lessons`);
  console.log(
    `   📆 This week:        ${weekCount} lessons (${completedThisWeek} done, ${scheduledThisWeek} upcoming)`
  );
  console.log(`   🎼 Lesson songs:     ${totalLessonSongs}`);
  console.log(`   📝 Assignments:      ${totalAssignments} (${pendingCount} pending)`);
  console.log('\n📊 Expected dashboard stats:');
  console.log(`   Active Students:     4`);
  console.log(`   This Week:           ${weekCount}`);
  console.log(`   Pending:             ${pendingCount}`);
  console.log(`   Student progress:    Zosia 60% | Kuba 40% | Maja 30% | Piotrek 20%`);
  console.log('\n🔑 Login credentials (password: Demo2024!)');
  for (const u of DEMO_USERS) {
    console.log(`   ${u.isTeacher ? 'Teacher' : 'Student'}: ${u.email}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
