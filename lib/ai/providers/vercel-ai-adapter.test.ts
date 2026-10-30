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

const mockCreateOpenAICompatible = jest.fn((_options: { name: string; baseURL: string }) => ({
  chatModel: (id: string) => ({ id }),
}));

jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: (options: { name: string; baseURL: string }) => mockCreateOpenAICompatible(options),
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
    expect(errorChunk.finishReason).toBe('error');
    expect(errorChunk.content).toBe('');
    expect(errorChunk.error).toContain('Insufficient credits');
    expect(errorChunk.error).toContain('402');
    expect(errorChunk.error).toContain('You have run out of OpenRouter credits');
    expect(errorChunk.error).not.toContain('No output generated');
  });

  it('falls back to the plain error message for non-APICallError failures', async () => {
    mockStreamText.mockReturnValue({
      fullStream: fullStreamOf([{ type: 'error', error: new Error('No output generated.') }]),
      usage: Promise.resolve(undefined),
      finishReason: Promise.resolve('error'),
    });

    const chunks = await collectStream(request);
    const errorChunk = chunks[chunks.length - 1];

    expect(errorChunk.error).toBe('No output generated.');
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

describe('generateStructuredOutput', () => {
  it('sends the system prompt as instructions, never as a system message', async () => {
    const { generateObject } = jest.requireMock('ai') as { generateObject: jest.Mock };
    generateObject.mockResolvedValue({ object: { ok: true }, usage: { inputTokens: 1, outputTokens: 2 } });
    const { generateStructuredOutput } = await import('./vercel-ai-adapter');
    const { z } = await import('zod');

    process.env.OPENROUTER_API_KEY = 'test-key';
    const result = await generateStructuredOutput({
      model: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
      systemPrompt: 'You are a parser.',
      userMessage: 'Parse this.',
      schema: z.object({ ok: z.boolean() }),
    });

    const call = generateObject.mock.calls[0][0];
    expect(call.instructions).toBe('You are a parser.');
    expect(call.messages).toEqual([{ role: 'user', content: 'Parse this.' }]);
    expect(result).toEqual({ data: { ok: true }, usage: { promptTokens: 1, completionTokens: 2 } });
  });
});

describe('system prompt handling and provider choice', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('moves registry system messages into instructions for complete()', async () => {
    const { generateText } = jest.requireMock('ai') as { generateText: jest.Mock };
    generateText.mockResolvedValue({ text: 'ok', finishReason: 'stop' });
    process.env.OPENROUTER_API_KEY = 'test-key';

    await createVercelAIProvider().complete({
      model: 'x',
      messages: [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'Hi' },
      ],
    } as AICompletionRequest);

    const call = generateText.mock.calls[0][0];
    expect(call.instructions).toBe('Be brief.');
    expect(call.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it('caps structured output tokens and runs an OpenAI choice on OpenAI', async () => {
    const { generateObject } = jest.requireMock('ai') as { generateObject: jest.Mock };
    generateObject.mockResolvedValue({ object: {} });
    process.env.OPENAI_API_KEY = 'sk-test';
    const { generateStructuredOutput } = await import('./vercel-ai-adapter');
    const { z } = await import('zod');

    await generateStructuredOutput({
      model: { provider: 'openai', model: 'gpt-test' },
      systemPrompt: 's',
      userMessage: 'u',
      schema: z.object({}),
    });

    const call = generateObject.mock.calls[0][0];
    expect(call.model).toEqual({ id: 'gpt-test' });
    expect(call.maxOutputTokens).toBe(4000);
  });

  it('sends an Ollama choice to the OpenAI-compatible endpoint of OLLAMA_BASE_URL', async () => {
    process.env.OLLAMA_BASE_URL = 'http://192.168.1.10:11434/';
    const { structuredModel } = await import('./vercel-ai-adapter');

    expect(structuredModel({ provider: 'ollama', model: 'gemma4:12b' })).toEqual({ id: 'gemma4:12b' });
    expect(mockCreateOpenAICompatible).toHaveBeenLastCalledWith({
      name: 'ollama',
      baseURL: 'http://192.168.1.10:11434/v1',
    });
  });
});
