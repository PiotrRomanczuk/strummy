import { toStreamError } from '@/lib/ai/stream-error';
import { runStream } from './useAIStream.helpers';

async function* chunks(...values: string[]) {
  yield* values;
}

const run = (stream: AsyncGenerator<string, void, undefined>, onChunk = jest.fn()) =>
  runStream({
    stream,
    abortSignal: undefined,
    sessionId: null,
    requestId: null,
    estimatedTotal: 0,
    options: { onChunk },
    setContent: jest.fn(),
    setTokenCount: jest.fn(),
    setProgress: jest.fn(),
    setStatus: jest.fn(),
    userId: undefined,
  });

describe('runStream', () => {
  it('passes model text to onChunk and returns the last chunk', async () => {
    const onChunk = jest.fn();

    await expect(run(chunks('Good', 'Good lesson'), onChunk)).resolves.toEqual({
      finalContent: 'Good lesson',
    });
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it('rejects on an error chunk and never hands it to onChunk', async () => {
    const onChunk = jest.fn();

    await expect(run(chunks(toStreamError('HTTP 402')), onChunk)).rejects.toThrow('HTTP 402');
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('keeps the partial text when the failure arrives mid-stream', async () => {
    const onChunk = jest.fn();

    await expect(run(chunks('Good', toStreamError('timeout')), onChunk)).rejects.toThrow('timeout');
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('Good');
  });
});
