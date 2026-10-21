import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildSummaryUserMessage,
  polishDate,
  POST_LESSON_SUMMARY_PROMPT,
  POST_LESSON_SUMMARY_PROMPT_VERSION,
  type SummaryPromptInput,
} from '@/lib/ai/agents/post-lesson-summary-prompt';
import { createLogger } from '@/lib/logger';
import { cancelPendingQueueEntries, sendNotification } from '@/lib/services/notification-service';

const log = createLogger('lesson-summary');

/**
 * Post-lesson summary (2026-10-21): the teacher's message to the student,
 * built from the lesson's own data (songs + statuses, notes, homework, next
 * lesson), kept on the lesson for the student and e-mailed as a lesson_recap
 * notification. The caller checks the actor may manage the lesson.
 */

/** Same free model as the lesson draft unless overridden. */
export const summaryModel = () =>
  process.env.LESSON_SUMMARY_MODEL || process.env.LESSON_DRAFT_MODEL || 'nvidia/nemotron-3.5-super-vl:free';

type Lesson = { id: string; student_id: string; scheduled_at: string; title: string | null; notes: string | null; summary: string | null };
type SongRow = { status: string | null; notes: string | null; songs: { title: string; author: string | null } | null };

export type SummaryResult =
  | { ok: true; summary: string; sent?: boolean }
  | { ok: false; code: 'not_found' | 'empty' | 'generation_failed' | 'send_failed'; message: string };

async function loadLesson(supabase: SupabaseClient, lessonId: string): Promise<Lesson | null> {
  const { data } = await supabase
    .from('lessons')
    .select('id, student_id, scheduled_at, title, notes, summary')
    .eq('id', lessonId)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as Lesson | null) ?? null;
}

async function loadPromptInput(supabase: SupabaseClient, lesson: Lesson): Promise<SummaryPromptInput> {
  const [student, songs, homework, next] = await Promise.all([
    supabase.from('profiles').select('first_name, full_name').eq('id', lesson.student_id).maybeSingle(),
    supabase.from('lesson_songs').select('status, notes, songs(title, author)').eq('lesson_id', lesson.id),
    supabase.from('assignments').select('title, checklist').eq('lesson_id', lesson.id).is('deleted_at', null).limit(1).maybeSingle(),
    supabase
      .from('lessons')
      .select('scheduled_at')
      .eq('student_id', lesson.student_id)
      .is('deleted_at', null)
      .gt('scheduled_at', lesson.scheduled_at)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const name = student.data?.first_name || student.data?.full_name?.split(' ')[0] || 'uczniu';
  const checklist = (homework.data?.checklist as { text?: string }[] | null) ?? [];
  return {
    studentFirstName: name,
    lessonDate: lesson.scheduled_at,
    songs: ((songs.data ?? []) as unknown as SongRow[])
      .filter((r) => r.songs)
      .map((r) => ({ title: r.songs!.title, artist: r.songs!.author, status: r.status, notes: r.notes })),
    teacherNotes: lesson.notes,
    homework: homework.data ? { title: homework.data.title as string, checklist: checklist.map((c) => c.text ?? '').filter(Boolean) } : null,
    nextLessonDate: (next.data?.scheduled_at as string | undefined) ?? null,
  };
}

export async function saveLessonSummary(supabase: SupabaseClient, lessonId: string, summary: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ summary, summary_generated_at: new Date().toISOString() })
    .eq('id', lessonId);
  if (error) throw new Error(`lesson-summary: save failed (${error.message})`);
}

export async function generateLessonSummary(supabase: SupabaseClient, lessonId: string, actorProfileId: string): Promise<SummaryResult> {
  const lesson = await loadLesson(supabase, lessonId);
  if (!lesson) return { ok: false, code: 'not_found', message: 'Lesson not found' };
  const input = await loadPromptInput(supabase, lesson);
  if (!input.songs.length && !input.teacherNotes) {
    return { ok: false, code: 'empty', message: 'The lesson has no songs or notes to summarise yet' };
  }

  const model = summaryModel();
  let summary = '';
  let error: string | null = null;
  try {
    const { generateTextOutput } = await import('@/lib/ai/providers/text-output');
    const result = await generateTextOutput({
      model,
      systemPrompt: POST_LESSON_SUMMARY_PROMPT,
      userMessage: buildSummaryUserMessage(input),
      reasoningEffort: 'low',
    });
    summary = result.text.trim();
    if (!summary) error = `Empty answer (${result.finishReason ?? 'unknown'})`;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await supabase.from('ai_generations').insert({
    profile_id: actorProfileId,
    generation_type: 'post_lesson_summary',
    agent_id: 'post-lesson-summary',
    model_id: model,
    provider: 'openrouter',
    input_params: { lessonId, promptVersion: POST_LESSON_SUMMARY_PROMPT_VERSION, songs: input.songs.length },
    output_content: summary,
    is_successful: !error,
    error_message: error,
    context_entity_type: 'lesson',
    context_entity_id: lessonId,
  });
  if (error) {
    log.warn('[lesson-summary] generation failed', { lessonId, error });
    return { ok: false, code: 'generation_failed', message: error };
  }
  await saveLessonSummary(supabase, lessonId, summary);
  return { ok: true, summary };
}

/** E-mails (and in-app notifies) the saved summary as a lesson_recap. */
export async function sendLessonSummary(supabase: SupabaseClient, lessonId: string): Promise<SummaryResult> {
  const lesson = await loadLesson(supabase, lessonId);
  if (!lesson) return { ok: false, code: 'not_found', message: 'Lesson not found' };
  if (!lesson.summary?.trim()) return { ok: false, code: 'empty', message: 'No summary to send' };

  const result = await sendNotification({
    type: 'lesson_recap',
    recipientUserId: lesson.student_id,
    templateData: { lessonDate: polishDate(lesson.scheduled_at), lessonTitle: lesson.title, summary: lesson.summary, lessonId, locale: 'pl' },
    entityType: 'lesson',
    entityId: lessonId,
    alwaysInApp: true,
  });
  if (!result.success) return { ok: false, code: 'send_failed', message: result.error ?? 'Notification failed' };
  // The completed-lesson trigger queued a generic recap; the summary replaces it.
  await cancelPendingQueueEntries('lesson', lessonId, 'lesson_recap');
  const sent = !result.skipped;
  if (sent) await supabase.from('lessons').update({ summary_sent_at: new Date().toISOString() }).eq('id', lessonId);
  return { ok: true, summary: lesson.summary, sent };
}
