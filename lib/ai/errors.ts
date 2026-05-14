/**
 * Typed AI Error Classes
 *
 * Replaces string-matching error detection with typed, instanceof-safe errors.
 */

export class AgentNotFoundError extends Error {
  readonly code = 'AGENT_NOT_FOUND' as const;
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMITED' as const;
  constructor(readonly retryAfter: number) {
    super(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends Error {
  readonly code = 'PERMISSION_DENIED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ContextError extends Error {
  readonly code = 'CONTEXT_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ContextError';
  }
}

export class ProviderError extends Error {
  readonly code = 'PROVIDER_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class TimeoutError extends Error {
  readonly code = 'TIMEOUT' as const;
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export type AIError =
  | AgentNotFoundError
  | RateLimitError
  | ValidationError
  | PermissionError
  | ContextError
  | ProviderError
  | TimeoutError;

export function getErrorCode(error: unknown): string {
  if (
    error instanceof AgentNotFoundError ||
    error instanceof RateLimitError ||
    error instanceof ValidationError ||
    error instanceof PermissionError ||
    error instanceof ContextError ||
    error instanceof ProviderError ||
    error instanceof TimeoutError
  ) {
    return error.code;
  }
  return 'EXECUTION_FAILED';
}
