/**
 * Raw-completion fallback for the lesson-transcript-draft agent (CNT-8), plus
 * the attempt record both paths fill in.
 *
 * Every model call leaves an attempt with the model's raw answer, so a failed
 * draft still shows what the model said (2026-10-21: drafts failed for a day
 * and nothing but "Failed to parse JSON response" was kept). The service
 * stores the attempts in ai_generations for comparing models and prompts.
 */

import { executeAgent } from '../agent-registry';
import { lessonTranscriptDraftSchema, type LessonTranscriptDraft } from '../schemas/lesson-transcript-draft';
import { ensureAgentRegistered } from './ensure-registered';

const RAW_LIMIT = 20_000;

export type DraftAttempt = {
  path: 'structured' | 'fallback';
  model: string;
  latencyMs: number;
  /** The model's answer as received (clipped), '' when the call itself failed. */
  raw: string;
  error: string | null;
};

export const clipRaw = (text: string): string => text.slice(0, RAW_LIMIT);

/** The AI SDK puts the model's unparseable answer on NoObjectGeneratedError.text. */
export function rawFromError(error: unknown): string {
  const text = (error as { text?: unknown } | null)?.text;
  return typeof text === 'string' ? clipRaw(text) : '';
}

/** The JSON object in a raw answer: code fences and any text around the outermost braces are dropped. */
export function extractJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?|```$/gm, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export async function viaFallback(
  userMessage: string,
  model: string
): Promise<{ draft: LessonTranscriptDraft | null; attempt: DraftAttempt }> {
  const started = Date.now();
  const attempt = (raw: string, error: string | null): DraftAttempt => ({
    path: 'fallback',
    model,
    latencyMs: Date.now() - started,
    raw: clipRaw(raw),
    error,
  });

  await ensureAgentRegistered('lesson-transcript-draft');
  const response = await executeAgent('lesson-transcript-draft', { userInput: userMessage }, {}, { model });
  if (!response?.success) {
    return { draft: null, attempt: attempt('', response?.error?.message || 'No response from agent') };
  }

  const resultObj = response.result as Record<string, unknown> | null;
  const raw = String(resultObj?.content ?? response.result ?? '');
  try {
    const parsed = lessonTranscriptDraftSchema.safeParse(extractJsonObject(raw));
    if (parsed.success) return { draft: parsed.data, attempt: attempt(raw, null) };
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.code}`);
    return { draft: null, attempt: attempt(raw, `Agent output did not match the draft schema (${issues.join('; ')})`) };
  } catch {
    return { draft: null, attempt: attempt(raw, 'Failed to parse JSON response') };
  }
}
