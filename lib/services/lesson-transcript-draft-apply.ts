import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import { createLogger } from '@/lib/logger';
import { queueNotification } from '@/lib/services/notification-service';
import type { ApplyAssignment, ApplySong, LessonDraftApply } from '@/schemas/LessonDraftApplySchema';

const log = createLogger('lesson-transcript-draft-apply');

/**
 * Writes an approved transcript draft into the lesson (CNT-8):
 * lessons (title, notes appended, optional COMPLETED) → lesson_songs (the
 * repertoire follows via fn_sync_lesson_song_to_repertoire) → assignments →
 * student_skills. The draft is claimed first (ready → applied in one UPDATE),
 * so a double click or a retried API call can never apply it twice.
 */

type Lesson = { id: string; student_id: string; teacher_id: string; title: string | null; notes: string | null; status: string; scheduled_at: string };

export type ApplyDraftResult =
  | { ok: true; songs: number; newSongs: number; assignmentId: string | null; skills: number }
  | { ok: false; code: 'not_found' | 'not_ready' | 'write_failed'; message: string };

function must<T>(step: string, res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`${step}: ${res.error.message}`);
  return res.data;
}

async function claimDraft(supabase: SupabaseClient, lessonId: string): Promise<boolean> {
  const { data } = await supabase
    .from('lesson_transcripts')
    .update({ draft_status: 'applied', draft_applied_at: new Date().toISOString() })
    .eq('lesson_id', lessonId)
    .eq('draft_status', 'ready')
    .select('id');
  return Boolean(data?.length);
}

async function updateLesson(supabase: SupabaseClient, lesson: Lesson, input: LessonDraftApply): Promise<void> {
  const notes = input.notes.trim();
  const patch: Record<string, unknown> = {};
  if (notes) patch.notes = lesson.notes?.trim() ? `${lesson.notes.trim()}\n\n${notes}` : notes;
  if (input.lessonTitle && !lesson.title?.trim()) patch.title = input.lessonTitle;
  if (input.markCompleted && lesson.status !== 'COMPLETED') patch.status = 'COMPLETED';
  if (!Object.keys(patch).length) return;
  must('lesson update', await supabase.from('lessons').update(patch).eq('id', lesson.id));
}

async function resolveSongId(supabase: SupabaseClient, song: ApplySong): Promise<{ id: string; isNew: boolean }> {
  if (song.songId) return { id: song.songId, isNew: false };
  const created = must(
    'song create',
    await supabase
      .from('songs')
      .insert({ title: song.newSong?.title, author: song.newSong?.author ?? null, is_draft: true })
      .select('id')
      .single()
  ) as { id: string };
  return { id: created.id, isNew: true };
}

async function writeSongs(supabase: SupabaseClient, lessonId: string, songs: ApplySong[]): Promise<number> {
  let created = 0;
  for (const song of songs) {
    const { id, isNew } = await resolveSongId(supabase, song);
    if (isNew) created += 1;
    must(
      'lesson song upsert',
      await supabase
        .from('lesson_songs')
        .upsert(
          { lesson_id: lessonId, song_id: id, status: song.status, notes: song.notes.trim() || null },
          { onConflict: 'lesson_id,song_id' }
        )
    );
  }
  return created;
}

async function nextLessonDate(supabase: SupabaseClient, lesson: Lesson): Promise<string | null> {
  const { data } = await supabase
    .from('lessons')
    .select('scheduled_at')
    .eq('student_id', lesson.student_id)
    .is('deleted_at', null)
    .gt('scheduled_at', lesson.scheduled_at)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.scheduled_at ? String(data.scheduled_at).slice(0, 10) : null;
}

async function writeAssignment(supabase: SupabaseClient, lesson: Lesson, a: ApplyAssignment): Promise<string> {
  const row = must(
    'assignment insert',
    await supabase
      .from('assignments')
      .insert({
        teacher_id: lesson.teacher_id,
        student_id: lesson.student_id,
        lesson_id: lesson.id,
        song_id: a.songId,
        title: a.title,
        description: a.description || null,
        checklist: a.checklist.map((text) => ({ id: randomUUID(), text, done: false })),
        due_date: a.dueDate ?? (await nextLessonDate(supabase, lesson)),
        daily_target_minutes: a.dailyTargetMinutes,
        submission_type: a.submissionType,
        status: 'not_started',
      })
      .select('id')
      .single()
  ) as { id: string };
  await notifyStudent(row.id, lesson.student_id, a.title);
  return row.id;
}

/** Same best-effort in-app notification as a hand-made assignment. */
async function notifyStudent(id: string, studentId: string, title: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE || '';
    await queueNotification({
      type: 'assignment_created',
      recipientUserId: studentId,
      templateData: { assignmentTitle: title, assignmentLink: `${baseUrl}/dashboard/assignments/${id}` },
      entityType: 'assignment',
      entityId: id,
      priority: 6,
    });
  } catch (error) {
    log.error('[apply] assignment_created notification failed', { error });
  }
}

async function writeSkills(supabase: SupabaseClient, studentId: string, input: LessonDraftApply): Promise<void> {
  if (!input.skills.length) return;
  const now = new Date().toISOString();
  must(
    'student skills upsert',
    await supabase.from('student_skills').upsert(
      input.skills.map((s) => ({
        student_id: studentId,
        skill_id: s.skillId,
        status: s.status,
        notes: s.note || null,
        last_assessed_at: now,
      })),
      { onConflict: 'student_id,skill_id' }
    )
  );
}

export async function applyLessonDraft(
  supabase: SupabaseClient,
  lessonId: string,
  input: LessonDraftApply
): Promise<ApplyDraftResult> {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, student_id, teacher_id, title, notes, status, scheduled_at')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return { ok: false, code: 'not_found', message: 'Lesson not found' };
  if (!(await claimDraft(supabase, lessonId))) {
    return { ok: false, code: 'not_ready', message: 'No draft ready to apply (missing or already applied)' };
  }

  try {
    await updateLesson(supabase, lesson as Lesson, input);
    const newSongs = await writeSongs(supabase, lessonId, input.songs);
    const assignmentId = input.assignment ? await writeAssignment(supabase, lesson as Lesson, input.assignment) : null;
    await writeSkills(supabase, (lesson as Lesson).student_id, input);
    log.info('[apply] draft applied', { lessonId, songs: input.songs.length, newSongs, assignmentId });
    return { ok: true, songs: input.songs.length, newSongs, assignmentId, skills: input.skills.length };
  } catch (error) {
    // Steps before the failure stay written; the draft stays claimed so a
    // retry cannot append the notes or the homework a second time.
    const message = error instanceof Error ? error.message : String(error);
    log.error('[apply] draft partially applied', { lessonId, error: message });
    return { ok: false, code: 'write_failed', message };
  }
}
