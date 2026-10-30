/**
 * Plain-text generation on the same model routing as generateStructuredOutput
 * (vercel-ai-adapter), with the OpenRouter reasoning cap — reasoning models
 * otherwise spend the whole output budget thinking. Used by the post-lesson
 * summary (2026-10-21).
 */
import { generateText } from 'ai';

import type { ModelChoice } from '../model-resolver';
import { structuredModel } from './vercel-ai-adapter';

export async function generateTextOutput(params: {
  model: ModelChoice;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningMaxTokens?: number;
}): Promise<{ text: string; finishReason?: string }> {
  const result = await generateText({
    model: structuredModel(params.model),
    instructions: params.systemPrompt,
    messages: [{ role: 'user', content: params.userMessage }],
    temperature: params.temperature ?? 0.4,
    maxOutputTokens: params.maxOutputTokens ?? 4000,
    providerOptions: params.reasoningMaxTokens
      ? { openrouter: { reasoning: { max_tokens: params.reasoningMaxTokens } } }
      : undefined,
  });
  return { text: result.text, finishReason: result.finishReason };
}
