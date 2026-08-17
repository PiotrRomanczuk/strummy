import {
  CREDITS_EXHAUSTED_MESSAGE,
  describeProviderError,
  isCreditsExhaustedError,
} from './provider-errors';

describe('isCreditsExhaustedError', () => {
  it('detects the real OpenRouter 402 body seen in production', () => {
    const error = new Error(
      'This request requires more credits, or fewer max_tokens. You requested up to 2048 tokens, ' +
        'but can only afford 636. To increase, visit https://openrouter.ai/settings/credits and ' +
        'upgrade to a paid account'
    );
    expect(isCreditsExhaustedError(error)).toBe(true);
  });

  it('detects it from the status code alone', () => {
    // The AI SDK attaches statusCode to AI_APICallError; the message wording is
    // the provider's and may change, the status will not.
    expect(isCreditsExhaustedError(Object.assign(new Error('nope'), { statusCode: 402 }))).toBe(
      true
    );
  });

  it('does not mistake other failures for a billing problem', () => {
    expect(isCreditsExhaustedError(new Error('fetch failed'))).toBe(false);
    expect(
      isCreditsExhaustedError(Object.assign(new Error('rate limited'), { statusCode: 429 }))
    ).toBe(false);
    // A 404 for a retired `:free` endpoint is a *model* problem and must keep
    // reading as one — that is the failure this message used to be confused with.
    expect(
      isCreditsExhaustedError(new Error('No :free endpoints available for any resolved models'))
    ).toBe(false);
  });

  it('tolerates non-Error values', () => {
    expect(isCreditsExhaustedError(undefined)).toBe(false);
    expect(isCreditsExhaustedError('can only afford 30')).toBe(true);
  });
});

describe('describeProviderError', () => {
  it('names credits as the cause, and points at the two remedies', () => {
    const message = describeProviderError(Object.assign(new Error('boom'), { statusCode: 402 }));
    expect(message).toBe(CREDITS_EXHAUSTED_MESSAGE);
    expect(message).toMatch(/out of credits/i);
    expect(message).toMatch(/AI_CHAT_MAX_OUTPUT_TOKENS/);
  });

  it('passes other messages through untouched', () => {
    expect(describeProviderError(new Error('upstream timeout'))).toBe('upstream timeout');
  });

  it('falls back to a generic message when there is nothing to report', () => {
    expect(describeProviderError(new Error(''))).toBe('Failed to generate AI response.');
  });
});
