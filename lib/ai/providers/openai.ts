import type { AICompletionRequest, AIModelInfo, AIProvider } from '../types';
import { createOpenRouterProvider } from './openrouter';

/**
 * OpenAI provider — the OpenRouter provider pointed at api.openai.com (the
 * wire protocol is identical), selected via AI_PROVIDER=openai.
 *
 * Every request is pinned to OPENAI_DEFAULT_MODEL (default: gpt-4.1-nano, the
 * cheapest chat model) regardless of what the caller asked for: requested
 * model ids are OpenRouter-style and would 404 on OpenAI anyway, and the
 * account funding this provider is intentionally tiny.
 */

const DEFAULT_MODEL = 'gpt-4.1-nano';

export const pinnedOpenAIModel = (): string => process.env.OPENAI_DEFAULT_MODEL || DEFAULT_MODEL;

const pin = (request: AICompletionRequest): AICompletionRequest => ({
  ...request,
  model: pinnedOpenAIModel(),
});

const listModels = async (): Promise<AIModelInfo[]> => [
  {
    id: pinnedOpenAIModel(),
    name: `OpenAI ${pinnedOpenAIModel()}`,
    provider: 'OpenAI',
    description: 'Cheapest OpenAI chat model; all requests are pinned to it.',
    bestFor: ['General purpose', 'E2E test generations'],
    contextWindow: 128000,
    isFree: false,
  },
];

export const createOpenAIProvider = (): AIProvider => {
  const inner = createOpenRouterProvider({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
  });

  return {
    ...inner,
    name: 'OpenAI' as const,
    listModels,
    complete: (request) => inner.complete(pin(request)),
    completeStream: (request, signal) => inner.completeStream!(pin(request), signal),
  };
};
