/**
 * Lesson Transcript Draft Agent (CNT-8)
 *
 * Reads a recorded lesson's transcript and proposes what to write back into
 * the lesson: songs with statuses and notes, homework, skills, lesson notes,
 * the teacher's own promises and questions to clarify. The output is a
 * proposal only — lib/services/lesson-transcript-draft.ts stores it and the
 * teacher applies it from the lesson page.
 */

import type { AgentSpecification } from '../agent-registry';
import { logger } from '@/lib/logger';

import {
  clipRaw,
  errorMessage,
  rawFromError,
  viaFallback,
  type DraftAttempt,
} from './lesson-transcript-draft-fallback';

import {
  lessonTranscriptDraftSchema,
  type LessonTranscriptDraft,
} from '../schemas/lesson-transcript-draft';
import {
  buildLessonDraftUserMessage,
  LESSON_DRAFT_JSON_SHAPE,
  LESSON_DRAFT_SYSTEM_PROMPT,
  TRANSCRIPT_PROMPT_MAX_CHARS,
  type LessonDraftPromptInput,
} from './lesson-transcript-draft-prompt';

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/** Overridable without a deploy of code: LESSON_DRAFT_MODEL in Vercel env. */
export const lessonDraftModel = () => process.env.LESSON_DRAFT_MODEL || DEFAULT_MODEL;

export const lessonTranscriptDraftAgent: AgentSpecification = {
  id: 'lesson-transcript-draft',
  name: 'Lesson Transcript Draft Agent',
  description: 'Turns a recorded lesson transcript into a reviewable draft of songs, notes, homework and skills',
  version: '1.0.0',

  purpose:
    'Fill a lesson from its recording: which songs were taught and how far, what to note, what homework was set, which techniques were practised.',

  targetUsers: ['admin', 'teacher'],

  useCases: [
    'Draft lesson notes from a Wispr Flow recording',
    'Propose lesson songs with progress statuses',
    'Propose homework and skill updates for the teacher to approve',
  ],

  limitations: [
    'Speech recognition mishears song titles and chord names',
    'Songs described without a title need the teacher to confirm',
    'Proposals only — never writes to the lesson without approval',
  ],

  systemPrompt: `${LESSON_DRAFT_SYSTEM_PROMPT}

CRITICAL: Respond ONLY with one JSON object of exactly this shape — same keys, every key present, no extra keys, no markdown code fences:
${LESSON_DRAFT_JSON_SHAPE}`,

  model: DEFAULT_MODEL,
  temperature: 0.2,
  // Reasoning models think before answering; 4000 left no room for the JSON (2026-10-21).
  maxTokens: 12000,

  requiredContext: [],
  optionalContext: [],

  inputValidation: {
    maxLength: TRANSCRIPT_PROMPT_MAX_CHARS + 20_000,
    allowedFields: ['userInput'],
    sensitiveDataHandling: 'allow',
  },

  enableLogging: true,
  enableAnalytics: false,

  dataAccess: {
    tables: ['lesson_transcripts', 'lessons', 'lesson_songs', 'assignments', 'student_skills'],
    permissions: ['read'],
  },

  successMetrics: ['draft_songs_accepted', 'draft_applied'],

  uiConfig: {
    category: 'content',
    icon: 'file-text',
    placement: ['inline'],
  },
};

export type LessonDraftResult =
  | { success: true; data: LessonTranscriptDraft; model: string; attempts: DraftAttempt[] }
  | { success: false; error: string; model: string; attempts: DraftAttempt[] };

/**
 * Structured output first (AI SDK generateObject), the registry's raw
 * completion + schema validation as a fallback, both on the same model.
 * Every call is recorded in `attempts`, raw answer included.
 */
export async function generateLessonTranscriptDraft(input: LessonDraftPromptInput): Promise<LessonDraftResult> {
  const model = lessonDraftModel();
  const userMessage = buildLessonDraftUserMessage(input);
  const attempts: DraftAttempt[] = [];

  const started = Date.now();
  try {
    const { generateStructuredOutput } = await import('../providers/vercel-ai-adapter');
    const result = await generateStructuredOutput({
      model,
      systemPrompt: LESSON_DRAFT_SYSTEM_PROMPT,
      userMessage,
      schema: lessonTranscriptDraftSchema,
      schemaName: 'LessonTranscriptDraft',
      temperature: lessonTranscriptDraftAgent.temperature,
      maxOutputTokens: lessonTranscriptDraftAgent.maxTokens,
      reasoningEffort: 'low',
    });
    const raw = clipRaw(JSON.stringify(result.data));
    attempts.push({ path: 'structured', model, latencyMs: Date.now() - started, raw, error: null });
    return { success: true, data: result.data, model, attempts };
  } catch (structuredError) {
    const error = errorMessage(structuredError);
    attempts.push({ path: 'structured', model, latencyMs: Date.now() - started, raw: rawFromError(structuredError), error });
    logger.warn('[LessonTranscriptDraft] Structured output failed, falling back to raw:', { error });
  }

  try {
    const { draft, attempt } = await viaFallback(userMessage, model);
    attempts.push(attempt);
    return draft
      ? { success: true, data: draft, model, attempts }
      : { success: false, error: attempt.error ?? 'Unknown error', model, attempts };
  } catch (error) {
    return { success: false, error: errorMessage(error), model, attempts };
  }
}
