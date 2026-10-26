import { createFallbackProvider } from './fallback';
import type { AIProvider, AIResult, AIStreamChunk } from '../types';

type StreamImpl = () => AsyncGenerator<AIStreamChunk, void, undefined>;

const makeProvider = (
  name: string,
  opts: { isUp?: boolean; result?: AIResult; stream?: StreamImpl } = {}
): AIProvider => ({
  name,
  listModels: jest.fn().mockResolvedValue([]),
  complete: jest.fn().mockResolvedValue(opts.result ?? { content: `from ${name}` }),
  completeStream: jest.fn(opts.stream ?? (async function* () {
    yield { content: `from ${name}`, done: true };
  })),
  isAvailable: jest.fn().mockResolvedValue(opts.isUp ?? true),
  getConfig: jest.fn().mockReturnValue({}),
});

const failingStream = (error: string): StreamImpl =>
  async function* () {
    yield { content: '', done: true, finishReason: 'error', error };
  };

const request = { model: 'some/model:free', messages: [{ role: 'user' as const, content: 'hi' }] };

const collect = async (provider: AIProvider, signal?: AbortSignal) => {
  const chunks: AIStreamChunk[] = [];
  for await (const chunk of provider.completeStream!(request, signal)) chunks.push(chunk);
  return chunks;
};

describe('createFallbackProvider — complete', () => {
  it('stops at the first provider that answers', async () => {
    const [a, b] = [makeProvider('A'), makeProvider('B')];
    const result = await createFallbackProvider([{ provider: a }, { provider: b }]).complete(request);

    expect(result).toEqual({ content: 'from A' });
    expect(b.complete).not.toHaveBeenCalled();
  });

  it('skips unavailable providers and moves past errors', async () => {
    const a = makeProvider('A', { result: { error: '402 no credits' } });
    const b = makeProvider('B', { isUp: false });
    const c = makeProvider('C');
    const result = await createFallbackProvider([
      { provider: a },
      { provider: b },
      { provider: c },
    ]).complete(request);

    expect(result).toEqual({ content: 'from C' });
    expect(b.complete).not.toHaveBeenCalled();
  });

  it('reports every provider once all of them failed', async () => {
    const a = makeProvider('A', { result: { error: '402 no credits' } });
    const b = makeProvider('B', { isUp: false });
    const c = makeProvider('C');
    (c.complete as jest.Mock).mockRejectedValue(new Error('socket hang up'));
    const result = await createFallbackProvider([
      { provider: a },
      { provider: b },
      { provider: c },
    ]).complete(request);

    expect(result).toEqual({
      error:
        'All AI providers failed — A: 402 no credits; B: not configured or unreachable; C: socket hang up',
      code: 'ALL_PROVIDERS_FAILED',
    });
  });

  it('passes each provider its own model id', async () => {
    const a = makeProvider('A', { result: { error: 'down' } });
    const b = makeProvider('B');
    await createFallbackProvider([
      { provider: a },
      { provider: b, mapModel: () => 'local-model' },
    ]).complete(request);

    expect((a.complete as jest.Mock).mock.calls[0][0].model).toBe('some/model:free');
    expect((b.complete as jest.Mock).mock.calls[0][0].model).toBe('local-model');
  });
});

describe('createFallbackProvider — completeStream', () => {
  it('falls through an error chunk and a thrown error to the next provider', async () => {
    const a = makeProvider('A', { stream: failingStream('HTTP 402') });
    const b = makeProvider('B', {
      stream: async function* () {
        throw new Error('ECONNREFUSED');
      },
    });
    const c = makeProvider('C');
    const chunks = await collect(
      createFallbackProvider([{ provider: a }, { provider: b }, { provider: c }])
    );

    expect(chunks).toEqual([{ content: 'from C', done: true }]);
  });

  it('does not switch providers once text has been streamed', async () => {
    const a = makeProvider('A', {
      stream: async function* () {
        yield { content: 'partial', done: false };
        yield { content: '', done: true, finishReason: 'error', error: 'dropped' };
      },
    });
    const b = makeProvider('B');
    const chunks = await collect(createFallbackProvider([{ provider: a }, { provider: b }]));

    expect(chunks.map((c) => c.content)).toEqual(['partial', '']);
    expect(chunks[1].error).toBe('dropped');
    expect(b.completeStream).not.toHaveBeenCalled();
  });

  it('ends with one error chunk naming every provider when all fail', async () => {
    const a = makeProvider('A', { stream: failingStream('HTTP 402') });
    const b = makeProvider('B', { isUp: false });
    const c = makeProvider('C', { stream: failingStream('HTTP 404 model_not_found') });
    const chunks = await collect(
      createFallbackProvider([{ provider: a }, { provider: b }, { provider: c }])
    );

    expect(chunks).toEqual([
      {
        content: '',
        done: true,
        finishReason: 'error',
        error:
          'All AI providers failed — A: HTTP 402; B: not configured or unreachable; C: HTTP 404 model_not_found',
      },
    ]);
  });

  it('stops trying further providers once the caller aborted', async () => {
    const controller = new AbortController();
    const a = makeProvider('A', {
      stream: async function* () {
        controller.abort();
        yield { content: '', done: true, finishReason: 'cancelled' };
      },
    });
    const b = makeProvider('B');
    const chunks = await collect(
      createFallbackProvider([{ provider: a }, { provider: b }]),
      controller.signal
    );

    expect(chunks.at(-1)?.finishReason).toBe('cancelled');
    expect(b.completeStream).not.toHaveBeenCalled();
  });
});
