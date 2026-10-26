import type {
  AICompletionRequest,
  AIModelInfo,
  AIProvider,
  AIProviderConfig,
  AIResult,
  AIStreamChunk,
} from '../types';
import { isAIError } from '../types';
import { logger } from '@/lib/logger';

/**
 * Fallback provider — tries a fixed chain of providers in order and only
 * gives up once every one of them has failed (AI_PROVIDER=auto, the default).
 *
 * A provider is skipped when `isAvailable()` says no (missing key, Ollama host
 * unreachable). A stream moves on to the next provider only while nothing has
 * been yielded yet: once text reached the caller, switching would splice two
 * different answers together, so a later failure is passed through as-is.
 */

export interface FallbackEntry {
  provider: AIProvider;
  /** Translate the caller's (OpenRouter-style) model id for this provider. */
  mapModel?: (model: string) => string;
}

export const FALLBACK_PROVIDER_NAME = 'Auto';

const forEntry = (entry: FallbackEntry, request: AICompletionRequest): AICompletionRequest => ({
  ...request,
  model: entry.mapModel ? entry.mapModel(request.model) : request.model,
});

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'unknown error');

const summarize = (failures: string[]): string =>
  `All AI providers failed — ${failures.join('; ')}`;

async function isUsable(entry: FallbackEntry, failures: string[]): Promise<boolean> {
  const isUp = await entry.provider.isAvailable().catch(() => false);
  if (!isUp) failures.push(`${entry.provider.name}: not configured or unreachable`);
  return isUp;
}

async function complete(entries: FallbackEntry[], request: AICompletionRequest): Promise<AIResult> {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!(await isUsable(entry, failures))) continue;
    try {
      const result = await entry.provider.complete(forEntry(entry, request));
      if (!isAIError(result)) return result;
      failures.push(`${entry.provider.name}: ${result.error}`);
    } catch (error) {
      failures.push(`${entry.provider.name}: ${describe(error)}`);
    }
    logger.warn(`[AI Fallback] ${failures.at(-1)} — trying next provider`);
  }
  return { error: summarize(failures), code: 'ALL_PROVIDERS_FAILED' };
}

/** One provider's stream as chunks; a pre-content failure comes back as `error`. */
async function* attempt(
  entry: FallbackEntry,
  request: AICompletionRequest,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk, string | null, undefined> {
  const { provider } = entry;
  const mapped = forEntry(entry, request);
  if (!provider.completeStream) {
    const result = await provider.complete(mapped);
    if (isAIError(result)) return result.error;
    yield { content: result.content, done: true, finishReason: result.finishReason };
    return null;
  }
  let hasContent = false;
  try {
    for await (const chunk of provider.completeStream(mapped, signal)) {
      const isFailure = chunk.finishReason === 'error';
      if (isFailure && !hasContent) return chunk.error ?? 'stream failed';
      if (chunk.content) hasContent = true;
      yield chunk;
      if (chunk.done) return null;
    }
    return hasContent ? null : 'empty response';
  } catch (error) {
    if (!hasContent && !signal?.aborted) return describe(error);
    throw error;
  }
}

async function* completeStream(
  entries: FallbackEntry[],
  request: AICompletionRequest,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk, void, undefined> {
  const failures: string[] = [];
  for (const entry of entries) {
    if (signal?.aborted) break;
    if (!(await isUsable(entry, failures))) continue;
    const failure = yield* attempt(entry, request, signal);
    if (failure === null) return;
    failures.push(`${entry.provider.name}: ${failure}`);
    logger.warn(`[AI Fallback] ${failures.at(-1)} — trying next provider`);
  }
  if (signal?.aborted) {
    yield { content: '', done: true, finishReason: 'cancelled' };
    return;
  }
  const error = summarize(failures);
  logger.error(`[AI Fallback] ${error}`);
  yield { content: '', done: true, finishReason: 'error', error };
}

export const createFallbackProvider = (entries: FallbackEntry[]): AIProvider => ({
  name: FALLBACK_PROVIDER_NAME,
  // The primary provider's catalogue: callers pick OpenRouter-style ids, which
  // every later entry translates through its own mapModel.
  listModels: (): Promise<AIModelInfo[]> => entries[0].provider.listModels(),
  complete: (request) => complete(entries, request),
  completeStream: (request, signal) => completeStream(entries, request, signal),
  isAvailable: async () => {
    const states = await Promise.all(
      entries.map((e) => e.provider.isAvailable().catch(() => false))
    );
    return states.some(Boolean);
  },
  getConfig: (): AIProviderConfig => entries[0].provider.getConfig(),
});
