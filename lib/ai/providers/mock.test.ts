import { createMockProvider } from './mock';
import { isAIError } from '../types';

describe('mock AI provider', () => {
  const provider = createMockProvider();

  it('is always available and identifies itself', async () => {
    expect(provider.name).toBe('Mock');
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it('completes with deterministic content long enough for E2E assertions', async () => {
    const result = await provider.complete({ model: 'anything', messages: [] });
    expect(isAIError(result)).toBe(false);
    if (!isAIError(result)) {
      expect(result.content.length).toBeGreaterThan(40);
      expect(result.finishReason).toBe('stop');
    }
  });

  it('streams chunks that reassemble into the full response and terminate', async () => {
    const full = await provider.complete({ model: 'anything', messages: [] });
    let assembled = '';
    let sawDone = false;
    for await (const chunk of provider.completeStream!({ model: 'anything', messages: [] })) {
      assembled += chunk.content;
      if (chunk.done) sawDone = true;
    }
    expect(sawDone).toBe(true);
    if (!isAIError(full)) {
      expect(assembled).toBe(full.content);
    }
  });

  it('stops streaming when the signal aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const chunks: string[] = [];
    for await (const chunk of provider.completeStream!(
      { model: 'anything', messages: [] },
      controller.signal
    )) {
      chunks.push(chunk.content);
    }
    expect(chunks).toHaveLength(0);
  });
});
