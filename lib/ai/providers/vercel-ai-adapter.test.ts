/**
 * Vercel AI Adapter Tests
 *
 * Covers the completeStream error-surfacing fix: provider-level failures
 * (e.g. OpenRouter rejecting a paid-tier call) must yield the real cause,
 * not the AI SDK's generic "No output generated" message.
 */

class FakeAPICallError extends Error {
  statusCode?: number;
  responseBody?: string;
  constructor(message: string, opts: { statusCode?: number; responseBody?: string } = {}) {
    super(message);
    this.name = 'AI_APICallError';
    this.statusCode = opts.statusCode;
    this.responseBody = opts.responseBody;
  }
}

const mockStreamText = jest.fn();

jest.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  generateText: jest.fn(),
  generateObject: jest.fn(),
  APICallError: {
    isInstance: (error: unknown): error is FakeAPICallError => error instanceof FakeAPICallError,
  },
}));

jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: () => ({
    chatModel: (id: string) => ({ id }),
  }),
}));

// Auto-mocked by jest.setup — asserted explicitly in a couple of tests below.
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { createVercelAIProvider } from './vercel-ai-adapter';
import type { AICompletionRequest } from '../types';

async function collectStream(request: AICompletionRequest) {
  const provider = createVercelAIProvider();
  const chunks = [];
  for await (const chunk of provider.completeStream(request)) {
    chunks.push(chunk);
  }
  return chunks;
}

function fullStreamOf(parts: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const part of parts) yield part;
    },
  };
}

describe('Vercel AI adapter — completeStream', () => {
  const request: AICompletionRequest = {
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [{ role: 'user', content: 'hi' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('yields text-delta parts as content chunks on success', async () => {
    mockStreamText.mockReturnValue({
      fullStream: fullStreamOf([
        { type: 'text-delta', text: 'Hello' },
        { type: 'text-delta', text: ' world' },
      ]),
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 2 }),
      finishReason: Promise.resolve('stop'),
    });

    const chunks = await collectStream(request);

    expect(chunks[0]).toMatchObject({ content: 'Hello', done: false });
    expect(chunks[1]).toMatchObject({ content: ' world', done: false });
    expect(chunks[chunks.length - 1]).toMatchObject({ done: true, finishReason: 'stop' });
  });

  it('surfaces the real APICallError instead of a generic "no output" message', async () => {
    mockStreamText.mockReturnValue({
      fullStream: fullStreamOf([
        {
          type: 'error',
          error: new FakeAPICallError('Insufficient credits', {
            statusCode: 402,
            responseBody: 'You have run out of OpenRouter credits',
          }),
        },
      ]),
      usage: Promise.resolve(undefined),
      finishReason: Promise.resolve('error'),
    });

    const chunks = await collectStream(request);
    const errorChunk = chunks[chunks.length - 1];

    expect(errorChunk.done).toBe(true);
    expect(errorChunk.content).toContain('Insufficient credits');
    expect(errorChunk.content).toContain('402');
    expect(errorChunk.content).toContain('You have run out of OpenRouter credits');
    expect(errorChunk.content).not.toContain('No output generated');
  });

  it('falls back to the plain error message for non-APICallError failures', async () => {
    mockStreamText.mockReturnValue({
      fullStream: fullStreamOf([{ type: 'error', error: new Error('No output generated.') }]),
      usage: Promise.resolve(undefined),
      finishReason: Promise.resolve('error'),
    });

    const chunks = await collectStream(request);
    const errorChunk = chunks[chunks.length - 1];

    expect(errorChunk.content).toBe('Error: No output generated.');
  });

  it('reports a cancelled finish reason when the signal is already aborted', async () => {
    mockStreamText.mockImplementation(() => {
      throw new DOMException('Aborted', 'AbortError');
    });
    const controller = new AbortController();
    controller.abort();

    const provider = createVercelAIProvider();
    const chunks = [];
    for await (const chunk of provider.completeStream(request, controller.signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ content: '', done: true, finishReason: 'cancelled' }]);
  });
});
