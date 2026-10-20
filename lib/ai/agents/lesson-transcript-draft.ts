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
import { executeAgent } from '../agent-registry';
import { ensureAgentRegistered } from './ensure-registered';
import { logger } from '@/lib/logger';

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
  maxTokens: 4000,

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
  | { success: true; data: LessonTranscriptDraft; model: string }
  | { success: false; error: string; model: string };

async function viaFallback(userMessage: string, model: string): Promise<LessonDraftResult> {
  ensureAgentRegistered('lesson-transcript-draft');
  const response = await executeAgent('lesson-transcript-draft', { userInput: userMessage }, {});
  if (!response?.success) {
    return { success: false, error: response?.error?.message || 'No response from agent', model };
  }
  const resultObj = response.result as Record<string, unknown> | null;
  const raw = String(resultObj?.content ?? response.result ?? '').replace(/^```(?:json)?|```$/gm, '');
  try {
    const parsed = lessonTranscriptDraftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { success: true, data: parsed.data, model };
    // Paths and codes only — the values could quote the lesson.
    logger.warn('[LessonTranscriptDraft] Fallback output failed the schema', {
      issues: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.code}`),
    });
    return { success: false, error: 'Agent output did not match the draft schema', model };
  } catch {
    return { success: false, error: 'Failed to parse JSON response', model };
  }
}

/**
 * Structured output first (AI SDK generateObject); the registry's raw
 * completion + schema validation as a fallback — the same pattern as
 * song-chord-extraction.
 */
export async function generateLessonTranscriptDraft(input: LessonDraftPromptInput): Promise<LessonDraftResult> {
  const model = lessonDraftModel();
  const userMessage = buildLessonDraftUserMessage(input);

  try {
    const { generateStructuredOutput } = await import('../providers/vercel-ai-adapter');
    const result = await generateStructuredOutput({
      model,
      systemPrompt: LESSON_DRAFT_SYSTEM_PROMPT,
      userMessage,
      schema: lessonTranscriptDraftSchema,
      schemaName: 'LessonTranscriptDraft',
      temperature: lessonTranscriptDraftAgent.temperature,
    });
    return { success: true, data: result.data, model };
  } catch (structuredError) {
    logger.warn('[LessonTranscriptDraft] Structured output failed, falling back to raw:', {
      error: structuredError instanceof Error ? structuredError.message : String(structuredError),
    });
  }

  try {
    return await viaFallback(userMessage, model);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', model };
  }
}
