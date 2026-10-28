/**
 * AI Provider Types and Interfaces
 *
 * This file defines the core types and interfaces for the AI abstraction layer,
 * allowing easy switching between different LLM providers (OpenRouter, local models, etc.)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  bestFor: string[];
  contextWindow: number;
  isFree: boolean;
  isLocal?: boolean;
}

export interface AIProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

export interface AICompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Represents a chunk of streaming data from an AI provider
 */
export interface AIStreamChunk {
  /** Incremental content delta */
  content: string;
  /** Reasoning/thinking content (for models like DeepSeek R1) */
  reasoning?: string;
  /** Token usage statistics (if available in chunk) */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Finish reason when stream completes ('error' marks a failed stream) */
  finishReason?: string;
  /** Why the stream failed — set alongside finishReason: 'error' */
  error?: string;
  /** Whether this is the final chunk */
  done?: boolean;
}

export interface AIError {
  error: string;
  code?: string;
  details?: unknown;
}

export type AIResult = AICompletionResponse | AIError;

/**
 * Base interface that all AI providers must implement
 */
export interface AIProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;

  /**
   * List available models from this provider
   */
  listModels(): Promise<AIModelInfo[]>;

  /**
   * Generate a completion for the given messages
   */
  complete(request: AICompletionRequest): Promise<AIResult>;

  /**
   * Generate a streaming completion (optional, for providers that support it)
   * @param request The completion request
   * @param signal Optional AbortSignal for cancellation
   */
  completeStream?(
    request: AICompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<AIStreamChunk, void, undefined>;

  /**
   * Check if the provider is properly configured and available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider-specific configuration
   */
  getConfig(): AIProviderConfig;
}

/**
 * Helper type guard to check if result is an error
 */
export function isAIError(result: AIResult): result is AIError {
  return 'error' in result;
}
