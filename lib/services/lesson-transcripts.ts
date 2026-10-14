import {
  createLesson,
  fail,
  findNearbyLesson,
  findStudent,
  type Admin,
  type IngestTranscriptInput,
  type MatchedStudent,
} from './lesson-transcript-matching';

export type { IngestTranscriptInput } from './lesson-transcript-matching';

export type IngestTranscriptResult = {
  lessonId: string;
  transcriptId: string;
  lessonCreated: boolean;
  student: MatchedStudent;
};

export type IngestTranscriptError = { error: 'student_not_found' };

type TranscriptRef = { id: string; lesson_id: string };

function transcriptColumns(input: IngestTranscriptInput) {
  return {
    source: input.source,
    external_id: input.external_id,
    recorded_at: input.started_at,
    ended_at: input.ended_at ?? null,
    summary: input.summary ?? null,
    body: input.transcript,
    language: input.language,
    share_link: input.share_link ?? null,
  };
}

async function findTranscript(
  admin: Admin,
  column: 'external_id' | 'lesson_id',
  value: string
): Promise<TranscriptRef | null> {
  const { data, error } = await admin
    .from('lesson_transcripts')
    .select('id, lesson_id')
    .eq(column, value)
    .maybeSingle();
  if (error) fail('transcript lookup', error.message);
  return data;
}

async function updateTranscript(admin: Admin, id: string, input: IngestTranscriptInput) {
  const { error } = await admin
    .from('lesson_transcripts')
    .update(transcriptColumns(input))
    .eq('id', id);
  if (error) fail('transcript update', error.message);
}

async function insertTranscript(
  admin: Admin,
  lessonId: string,
  input: IngestTranscriptInput
): Promise<string> {
  const { data, error } = await admin
    .from('lesson_transcripts')
    .insert({
      lesson_id: lessonId,
      created_by: input.teacherProfileId,
      ...transcriptColumns(input),
    })
    .select('id')
    .single();
  if (error || !data) fail('transcript insert', error?.message);
  return data.id;
}

/**
 * Attach a transcript to the student's lesson nearest `started_at` (±90 min),
 * creating a COMPLETED lesson when none exists. Re-sending the same
 * `external_id` updates the stored text and returns the same ids; a lesson
 * that already has a transcript gets it replaced rather than duplicated.
 */
export async function ingestTranscript(
  admin: Admin,
  input: IngestTranscriptInput
): Promise<IngestTranscriptResult | IngestTranscriptError> {
  const student = await findStudent(admin, input.student_email);
  if (!student) return { error: 'student_not_found' };

  const existing = await findTranscript(admin, 'external_id', input.external_id);
  if (existing) {
    await updateTranscript(admin, existing.id, input);
    return {
      lessonId: existing.lesson_id,
      transcriptId: existing.id,
      lessonCreated: false,
      student,
    };
  }

  const matched = await findNearbyLesson(admin, student.id, input.started_at);
  const lessonId = matched ?? (await createLesson(admin, input, student.id));

  const onLesson = await findTranscript(admin, 'lesson_id', lessonId);
  if (onLesson) await updateTranscript(admin, onLesson.id, input);
  const transcriptId = onLesson?.id ?? (await insertTranscript(admin, lessonId, input));

  return { lessonId, transcriptId, lessonCreated: matched === null, student };
}
