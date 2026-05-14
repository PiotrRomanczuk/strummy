/**
 * @jest-environment node
 */

/**
 * Streaming Integration Tests (F-23)
 *
 * Tests for completeStream on OpenRouter (SSE) and Ollama (NDJSON).
 * All HTTP calls are mocked — no real API calls.
 *
 * Requires node environment: ReadableStream and TextEncoder are Node globals
 * (available since Node 18). jsdom does not expose ReadableStream on global.
 */

import { createOpenRouterProvider } from '../providers/openrouter';
import { createOllamaProvider } from '../providers/ollama';
import type { AIStreamChunk } from '../types';

// Mock retry so it just calls through — avoids delay and supabase deps
jest.mock('../retry', () => ({
  withRetry: jest.fn((fn: () => unknown) => fn()),
  AI_PROVIDER_RETRY_CONFIG: {},
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSseStream(...lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
}

function makeNdjsonStream(...objects: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const obj of objects) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }
      controller.close();
    },
  });
}

async function collectChunks(gen: AsyncGenerator<AIStreamChunk>): Promise<AIStreamChunk[]> {
  const chunks: AIStreamChunk[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

const baseRequest = { model: 'test-model', messages: [{ role: 'user' as const, content: 'hi' }] };

// ─── OpenRouter (SSE) ────────────────────────────────────────────────────────

describe('OpenRouter completeStream', () => {
  const provider = createOpenRouterProvider({ apiKey: 'test-key' });

  beforeEach(() => mockFetch.mockReset());

  it('OR-1: emits content chunks and terminates on [DONE]', async () => {
    const sseBody = makeSseStream(
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n\n',
      'data: [DONE]\n\n'
    );
    mockFetch.mockResolvedValueOnce({ ok: true, body: sseBody });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    const contentChunks = chunks.filter((c) => c.content);
    expect(contentChunks.map((c) => c.content)).toEqual(['Hello', ' world']);

    const doneChunk = chunks.find((c) => c.done === true);
    expect(doneChunk).toBeDefined();
    expect(doneChunk?.finishReason).toBe('stop');
  });

  it('OR-2: terminates gracefully on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'error', content: '' });
  });

  it('OR-3: yields cancelled chunk when AbortSignal fires', async () => {
    // Simulate fetch throwing with signal aborted
    const controller = new AbortController();
    const signal = controller.signal;

    mockFetch.mockImplementationOnce(() => {
      controller.abort();
      const err = new DOMException('Aborted', 'AbortError');
      return Promise.reject(err);
    });

    const chunks = await collectChunks(provider.completeStream!(baseRequest, signal));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'cancelled', content: '' });
  });

  it('OR-4: yields finish_reason from SSE when provider sends it before [DONE]', async () => {
    const sseBody = makeSseStream(
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":"stop"}]}\n\n'
    );
    mockFetch.mockResolvedValueOnce({ ok: true, body: sseBody });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    const finalChunk = chunks.find((c) => c.done === true);
    expect(finalChunk?.finishReason).toBe('stop');
  });

  it('OR-5: yields error chunk when response has no body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, body: null });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'error' });
  });

  it('OR-6: returns error chunk immediately when apiKey is missing', async () => {
    const noKeyProvider = createOpenRouterProvider({ apiKey: undefined });
    // Unset env var too
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const chunks = await collectChunks(noKeyProvider.completeStream!(baseRequest));

    process.env.OPENROUTER_API_KEY = saved;
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'error' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Ollama (NDJSON) ─────────────────────────────────────────────────────────

describe('Ollama completeStream', () => {
  const provider = createOllamaProvider({ baseUrl: 'http://localhost:11434' });

  beforeEach(() => mockFetch.mockReset());

  it('OL-1: emits content chunks and terminates on done: true', async () => {
    const ndjsonBody = makeNdjsonStream(
      { message: { content: 'G' }, done: false },
      { message: { content: ' major' }, done: false },
      {
        message: { content: '' },
        done: true,
        done_reason: 'stop',
        prompt_eval_count: 5,
        eval_count: 10,
      }
    );
    mockFetch.mockResolvedValueOnce({ ok: true, body: ndjsonBody });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    const content = chunks
      .filter((c) => !c.done)
      .map((c) => c.content)
      .join('');
    expect(content).toBe('G major');

    const doneChunk = chunks.find((c) => c.done === true);
    expect(doneChunk).toBeDefined();
    expect(doneChunk?.finishReason).toBe('stop');
    expect(doneChunk?.usage?.promptTokens).toBe(5);
    expect(doneChunk?.usage?.completionTokens).toBe(10);
  });

  it('OL-2: yields error chunk on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      body: null,
    });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'error' });
  });

  it('OL-3: yields error chunk on fetch rejection (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, finishReason: 'error' });
  });

  it('OL-4: skips malformed NDJSON lines without crashing', async () => {
    const encoder = new TextEncoder();
    const ndjsonBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('not-valid-json\n'));
        controller.enqueue(
          encoder.encode(JSON.stringify({ message: { content: 'ok' }, done: false }) + '\n')
        );
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ message: { content: '' }, done: true, done_reason: 'stop' }) + '\n'
          )
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: ndjsonBody });

    const chunks = await collectChunks(provider.completeStream!(baseRequest));

    // Malformed line is silently skipped; valid chunks should still arrive
    const contentChunks = chunks.filter((c) => !c.done && c.content);
    expect(contentChunks).toHaveLength(1);
    expect(contentChunks[0].content).toBe('ok');
  });
});
