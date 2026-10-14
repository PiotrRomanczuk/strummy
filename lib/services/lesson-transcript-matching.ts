import type { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import type { TranscriptIngestInput } from '@/schemas/LessonTranscriptSchema';

const log = createLogger('lesson-transcript-matching');

/** A recording whose start is within this window of a lesson's slot belongs to it. */
export const MATCH_WINDOW_MS = 90 * 60_000;
const DEFAULT_DURATION_MINUTES = 60;

export type Admin = ReturnType<typeof createAdminClient>;

export type IngestTranscriptInput = TranscriptIngestInput & {
  /** `profiles.id` of the authenticated teacher — owner of a lesson we create. */
  teacherProfileId: string;
};

export type MatchedStudent = { id: string; name: string | null };

export function fail(step: string, message: string | undefined): never {
  log.error(`[lesson-transcripts] ${step} failed`, { error: message });
  throw new Error(`lesson-transcripts: ${step} failed`);
}

/** Case-insensitive match on `email` or `invite_email`; never creates a profile. */
export async function findStudent(admin: Admin, email: string): Promise<MatchedStudent | null> {
  const needle = email.trim().toLowerCase();
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, invite_email')
    .or(`email.ilike.${needle},invite_email.ilike.${needle}`)
    .limit(5);
  if (error) fail('student lookup', error.message);
  // ilike treats `_` as a wildcard, so confirm the match exactly in code.
  const row = (data ?? []).find(
    (r) => r.email?.toLowerCase() === needle || r.invite_email?.toLowerCase() === needle
  );
  return row ? { id: row.id, name: row.full_name } : null;
}

/** The student's non-deleted lesson closest to `startedAt`, within ±90 min. */
export async function findNearbyLesson(
  admin: Admin,
  studentId: string,
  startedAt: string
): Promise<string | null> {
  const start = new Date(startedAt).getTime();
  const { data, error } = await admin
    .from('lessons')
    .select('id, scheduled_at')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .gte('scheduled_at', new Date(start - MATCH_WINDOW_MS).toISOString())
    .lte('scheduled_at', new Date(start + MATCH_WINDOW_MS).toISOString());
  if (error) fail('lesson lookup', error.message);
  const closest = (data ?? [])
    .map((row) => ({ id: row.id, gap: Math.abs(new Date(row.scheduled_at).getTime() - start) }))
    .sort((a, b) => a.gap - b.gap)[0];
  return closest?.id ?? null;
}

export function durationMinutes(startedAt: string, endedAt?: string): number {
  if (!endedAt) return DEFAULT_DURATION_MINUTES;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return ms > 0 ? Math.round(ms / 60_000) : DEFAULT_DURATION_MINUTES;
}

/** A recording with no lesson in its window gets a COMPLETED lesson at its start time. */
export async function createLesson(
  admin: Admin,
  input: IngestTranscriptInput,
  studentId: string
): Promise<string> {
  const { data, error } = await admin
    .from('lessons')
    .insert({
      teacher_id: input.teacherProfileId,
      student_id: studentId,
      scheduled_at: input.started_at,
      duration_minutes: durationMinutes(input.started_at, input.ended_at),
      title: input.title ?? `Lekcja ${input.started_at.slice(0, 10)}`,
      status: 'COMPLETED',
    })
    .select('id')
    .single();
  if (error || !data) fail('lesson create', error?.message);
  return data.id;
}
