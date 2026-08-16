/**
 * Turn a raw provider failure into something that names the actual cause.
 *
 * OpenRouter reports an exhausted balance as HTTP 402:
 *
 *   "This request requires more credits, or fewer max_tokens. You requested up
 *    to 2048 tokens, but can only afford 636."
 *
 * Nothing upstream distinguished that from any other failure, so the chat UI
 * fell back to "the configured model is unavailable" — which is wrong twice
 * over: the model was fine, and the fix is billing, not configuration. On
 * 2026-08-16 that sentence sent a production investigation after model ids
 * while every message had been failing on credit for some time.
 *
 * Lives outside `app/actions/ai/core.ts` because that file is `'use server'`,
 * where every export must be an async server action — a sync helper cannot be
 * exported from it, let alone unit-tested.
 */

/** True when a provider error is an exhausted-balance rejection. */
export function isCreditsExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;

  if (statusCode === 402) return true;
  return /requires more credits|can only afford|upgrade to a paid account/i.test(message);
}

export const CREDITS_EXHAUSTED_MESSAGE =
  'The AI provider rejected the request because the account is out of credits (HTTP 402). ' +
  'Add credits at https://openrouter.ai/settings/credits, or lower AI_CHAT_MAX_OUTPUT_TOKENS ' +
  'to fit the remaining balance.';

/** Message to surface for a failed generation. */
export function describeProviderError(error: unknown): string {
  if (isCreditsExhaustedError(error)) return CREDITS_EXHAUSTED_MESSAGE;

  const message = error instanceof Error ? error.message : String(error ?? '');
  return message || 'Failed to generate AI response.';
}
