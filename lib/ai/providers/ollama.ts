/**
 * Ollama Local LLM Provider
 *
 * Implements the AIProvider interface for local Ollama instances
 * Ollama must be running locally (default: http://localhost:11434)
 */

import type {
  AIProvider,
  AIProviderConfig,
  AICompletionRequest,
  AIResult,
  AIModelInfo,
  AIStreamChunk,
} from '../types';
import { withRetry, AI_PROVIDER_RETRY_CONFIG } from '../retry';
import { logger } from '@/lib/logger';

// Default Ollama configuration
const createDefaultConfig = (config?: Partial<AIProviderConfig>): AIProviderConfig => ({
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  timeout: 60000, // Longer timeout for local models
  maxRetries: 2,
  ...config,
});

// List available models from Ollama
const listModels = async (config: AIProviderConfig): Promise<AIModelInfo[]> => {
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.error('[Ollama] Failed to fetch models');
      return LOCAL_FALLBACK_MODELS;
    }

    const data = await response.json();

    // Transform Ollama model format to our AIModelInfo format
    return (data.models || []).map((model: { name: string }) => ({
      id: model.name,
      name: model.name,
      provider: 'Ollama',
      description: `Local model: ${model.name}`,
      bestFor: ['Local inference', 'Privacy', 'No API costs'],
      contextWindow: 4096, // Default, could be parsed from model details
      isFree: true,
      isLocal: true,
    }));
  } catch (error) {
    logger.error('[Ollama] Error listing models:', error);
    return LOCAL_FALLBACK_MODELS;
  }
};

// Complete a chat request
const complete = async (
  request: AICompletionRequest,
  config: AIProviderConfig
): Promise<AIResult> => {
  // Wrap in retry logic
  return withRetry(async () => {
    try {
      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(config.timeout || 120000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('[Ollama] API Error:', errorText);

        // Create error with status for retry logic
        const apiError = new Error(`Ollama API Error: ${response.statusText}`);
        (apiError as Error & { status: number }).status = response.status;
        throw apiError;
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        finishReason: data.done ? 'stop' : 'length',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      logger.error('[Ollama] Request failed:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: 'Request timeout - the model took too long to respond',
            code: 'TIMEOUT',
          };
        }
        return {
          error: `Failed to connect to Ollama: ${error.message}`,
          code: 'PROVIDER_ERROR',
        };
      }

      return {
        error: 'Failed to connect to Ollama. Make sure Ollama is running locally.',
      };
    }
  }, AI_PROVIDER_RETRY_CONFIG);
};

// Stream a chat completion — Ollama responds with NDJSON (one JSON object per line)
async function* completeStream(
  request: AICompletionRequest,
  config: AIProviderConfig,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk, void, undefined> {
  try {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens,
        },
      }),
      signal: signal || AbortSignal.timeout(config.timeout || 120000),
    });

    if (!response.ok || !response.body) {
      logger.error('[Ollama] Streaming request failed:', response.statusText);
      yield { content: '', finishReason: 'error', done: true };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as {
              message?: { content?: string };
              done?: boolean;
              done_reason?: string;
              eval_count?: number;
              prompt_eval_count?: number;
            };
            const content = parsed.message?.content || '';
            if (parsed.done) {
              yield {
                content,
                finishReason: parsed.done_reason || 'stop',
                usage: {
                  promptTokens: parsed.prompt_eval_count,
                  completionTokens: parsed.eval_count,
                  totalTokens: (parsed.prompt_eval_count ?? 0) + (parsed.eval_count ?? 0),
                },
                done: true,
              };
              return;
            }
            if (content) yield { content, done: false };
          } catch {
            // malformed line — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    logger.error('[Ollama] Streaming request failed:', error);
    yield { content: '', finishReason: 'error', done: true };
  }
}

// Check if Ollama is available
const isAvailable = async (config: AIProviderConfig): Promise<boolean> => {
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Create Ollama provider instance
export const createOllamaProvider = (config?: Partial<AIProviderConfig>): AIProvider => {
  const providerConfig = createDefaultConfig(config);

  return {
    name: 'Ollama',
    listModels: () => listModels(providerConfig),
    complete: (request: AICompletionRequest) => complete(request, providerConfig),
    completeStream: (request: AICompletionRequest, signal?: AbortSignal) =>
      completeStream(request, providerConfig, signal),
    isAvailable: () => isAvailable(providerConfig),
    getConfig: () => ({ ...providerConfig }),
  };
};

// Legacy class wrapper for backward compatibility
export class OllamaProvider implements AIProvider {
  readonly name = 'Ollama';
  private provider: AIProvider;

  constructor(config?: Partial<AIProviderConfig>) {
    this.provider = createOllamaProvider(config);
  }

  async listModels(): Promise<AIModelInfo[]> {
    return this.provider.listModels();
  }

  async complete(request: AICompletionRequest): Promise<AIResult> {
    return this.provider.complete(request);
  }

  completeStream(
    request: AICompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<AIStreamChunk, void, undefined> {
    return this.provider.completeStream!(request, signal);
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  getConfig(): AIProviderConfig {
    return this.provider.getConfig();
  }
}

// Common local models to suggest if Ollama is available
const LOCAL_FALLBACK_MODELS: AIModelInfo[] = [
  {
    id: 'gemma3:12b',
    name: 'Gemma 3 12B',
    provider: 'Ollama',
    description: "Google's Gemma 3 12B — standard local testing model",
    bestFor: ['General purpose', 'Instruction following', 'Local privacy'],
    contextWindow: 128000,
    isFree: true,
    isLocal: true,
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    provider: 'Ollama',
    description: "Meta's Llama 3.2 - balanced performance and speed",
    bestFor: ['General purpose', 'Fast responses', 'Local privacy'],
    contextWindow: 128000,
    isFree: true,
    isLocal: true,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'Ollama',
    description: 'Mistral 7B - efficient and capable',
    bestFor: ['General tasks', 'Coding', 'Fast inference'],
    contextWindow: 32768,
    isFree: true,
    isLocal: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'Ollama',
    description: 'DeepSeek R1 - reasoning focused',
    bestFor: ['Reasoning', 'Math', 'Complex logic'],
    contextWindow: 163840,
    isFree: true,
    isLocal: true,
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    provider: 'Ollama',
    description: 'Qwen 2.5 - multilingual support',
    bestFor: ['Multilingual', 'General chat', 'Code generation'],
    contextWindow: 32768,
    isFree: true,
    isLocal: true,
  },
];
