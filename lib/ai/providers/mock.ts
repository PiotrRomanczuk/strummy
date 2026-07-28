import type {
  AICompletionRequest,
  AIModelInfo,
  AIProvider,
  AIProviderConfig,
  AIResult,
  AIStreamChunk,
} from '../types';

/**
 * Deterministic mock AI provider for E2E and local testing.
 *
 * Selected via AI_PROVIDER=mock (see provider-factory). Returns a canned
 * multi-sentence response with zero network I/O, so test runs cost no
 * provider credits and don't depend on Ollama or OpenRouter being up.
 * Never enable in production — it exists purely so the AI UI flows
 * (streaming, completion states, feedback capture) can be exercised.
 */

const MOCK_MODEL = 'mock-model';

const MOCK_RESPONSE =
  'This is a mock AI response generated for end-to-end testing. ' +
  'It streams in several chunks, is long enough to satisfy content-length ' +
  'assertions, and completes immediately without calling any provider.';

const usage = {
  promptTokens: 10,
  completionTokens: 40,
  totalTokens: 50,
};

async function listModels(): Promise<AIModelInfo[]> {
  return [
    {
      id: MOCK_MODEL,
      name: 'Mock Model (E2E)',
      provider: 'mock',
      description: 'Deterministic canned responses for end-to-end tests',
      bestFor: ['testing'],
      contextWindow: 8192,
      isFree: true,
      isLocal: true,
    },
  ];
}

async function complete(_request: AICompletionRequest): Promise<AIResult> {
  return { content: MOCK_RESPONSE, finishReason: 'stop', usage };
}

async function* completeStream(
  _request: AICompletionRequest,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk, void, undefined> {
  const words = MOCK_RESPONSE.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    yield { content: i === 0 ? words[i] : ` ${words[i]}` };
  }
  yield { content: '', finishReason: 'stop', done: true, usage };
}

export const createMockProvider = (): AIProvider => ({
  name: 'Mock',
  listModels,
  complete,
  completeStream,
  isAvailable: async () => true,
  getConfig: (): AIProviderConfig => ({}),
});
