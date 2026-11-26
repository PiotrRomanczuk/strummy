/**
 * Runs one batch of songs through a model (SNG-15). The model is passed in as `ask`, so this stays free of any
 * provider: the generating script plugs in the local Ollama model or Claude Code in headless mode, both on a home
 * machine. The app itself never calls a model for suggestions — it only shows and applies them.
 */

import type { AIMessage } from '@/lib/ai/types';

import type { SuggestField, SuggestSong } from './fields';
import { buildMessages, parseAnswer, type ParsedSuggestion } from './prompt';

/** Songs per request: small enough for a quick, well-formed answer, large enough to keep requests few. */
export const BATCH_SIZE = 20;

export type Ask = (messages: AIMessage[]) => Promise<{ content: string } | { error: string }>;

export interface BatchResult {
  suggestions: (ParsedSuggestion & { source: string })[];
  error: string | null;
}

export async function suggestBatch(
  field: SuggestField,
  songs: SuggestSong[],
  ask: Ask,
  source: string
): Promise<BatchResult> {
  if (songs.length === 0) return { suggestions: [], error: null };
  const answer = await ask(buildMessages(field, songs));
  if ('error' in answer) return { suggestions: [], error: answer.error };
  return {
    suggestions: parseAnswer(field, answer.content, songs).map((s) => ({ ...s, source })),
    error: null,
  };
}
