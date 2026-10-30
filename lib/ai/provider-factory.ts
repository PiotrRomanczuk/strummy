/**
 * AI Provider Factory
 *
 * Central factory for creating and managing AI providers.
 * Supports easy switching between OpenRouter, local models, and future providers.
 */

import type { AIProvider } from './types';
import type { ModelProvider } from './model-resolver';
import { createOpenRouterProvider } from './providers/openrouter';
import { createOllamaProvider } from './providers/ollama';
import { createOpenAIProvider } from './providers/openai';
import { createFallbackProvider } from './providers/fallback';
import { mapToOllamaModel } from './model-mappings';
import { logger } from '@/lib/logger';

/**
 * Whether to use the Vercel AI SDK adapter for OpenRouter.
 * Set AI_USE_VERCEL_SDK=false to fall back to the custom fetch-based provider.
 */
const useVercelSDK = process.env.AI_USE_VERCEL_SDK !== 'false';

export type ProviderType = 'openrouter' | 'openai' | 'ollama' | 'mock' | 'auto';

/**
 * Configuration for the AI provider system
 */
export interface ProviderFactoryConfig {
  /**
   * Which provider to use
   * - 'openrouter' | 'ollama' | 'openai' | 'mock': only that provider
   * - 'auto' (default): OpenRouter → Ollama → OpenAI, each tried in turn until
   *   one answers (see providers/fallback)
   */
  provider: ProviderType;
}

// Functional implementation

/**
 * Creates the default factory configuration
 */
const createDefaultFactoryConfig = (): ProviderFactoryConfig => {
  const providerType = (process.env.AI_PROVIDER?.toLowerCase() || 'auto') as ProviderType;

  return { provider: providerType };
};

// Module-level state for singleton pattern in functional approach
let factoryConfig: ProviderFactoryConfig = createDefaultFactoryConfig();
let cachedProvider: AIProvider | null = null;
/** One instance per provider type for getProviderFor (resolved model choices). */
const providersByType = new Map<ModelProvider, AIProvider>();

/**
 * Updates factory configuration
 */
const updateFactoryConfig = (config: Partial<ProviderFactoryConfig>): void => {
  factoryConfig = { ...factoryConfig, ...config };
  cachedProvider = null; // Clear cache when config changes
};

/**
 * Creates the appropriate OpenRouter provider (Vercel SDK or legacy fetch).
 * Uses dynamic import for the Vercel adapter to avoid TransformStream issues in test environments.
 */
const createOpenRouter = async (): Promise<AIProvider> => {
  if (useVercelSDK) {
    try {
      const { createVercelAIProvider } = await import('./providers/vercel-ai-adapter');
      return createVercelAIProvider();
    } catch {
      logger.warn(
        '[AIProviderFactory] Vercel AI SDK unavailable, falling back to fetch-based provider'
      );
    }
  }
  return createOpenRouterProvider();
};

export const AUTO_FALLBACK_ORDER = ['OpenRouter', 'Ollama', 'OpenAI'] as const;

/**
 * The fixed fallback order: OpenRouter (cloud, primary), then the local Ollama
 * host, then OpenAI direct. Every request walks the chain until one answers.
 */
const createAutoProvider = async (): Promise<AIProvider> =>
  createFallbackProvider([
    { provider: await createOpenRouter() },
    { provider: createOllamaProvider(), mapModel: mapToOllamaModel },
    { provider: createOpenAIProvider() },
  ]);

/**
 * Gets the current provider based on configuration
 */
const getProvider = async (): Promise<AIProvider> => {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  let provider: AIProvider;

  switch (factoryConfig.provider) {
    // Deterministic canned responses for E2E — zero cost, no network. Only
    // ever selected by an explicit AI_PROVIDER=mock env; never in production.
    case 'mock': {
      const { createMockProvider } = await import('./providers/mock');
      provider = createMockProvider();
      break;
    }

    case 'ollama':
      provider = createOllamaProvider();
      break;

    // OpenAI direct, pinned to the cheapest chat model (see providers/openai).
    case 'openai':
      provider = createOpenAIProvider();
      break;

    case 'openrouter':
      provider = await createOpenRouter();
      break;

    case 'auto':
    default:
      provider = await createAutoProvider();
      break;
  }

  // Cache the provider
  cachedProvider = provider;
  return provider;
};

/**
 * Gets list of all available providers
 */
const getAvailableProviders = async (): Promise<Array<{ name: string; available: boolean }>> => {
  const [openrouterAvailable, ollamaAvailable, openaiAvailable] = await Promise.all([
    createOpenRouterProvider().isAvailable(),
    createOllamaProvider().isAvailable(),
    createOpenAIProvider().isAvailable(),
  ]);

  return [
    { name: 'OpenRouter (Cloud)', available: openrouterAvailable },
    { name: 'Ollama (Local)', available: ollamaAvailable },
    { name: 'OpenAI (Cloud)', available: openaiAvailable },
  ];
};

/**
 * Clears cached provider (forces re-selection on next getProvider call)
 */
const clearProviderCache = (): void => {
  cachedProvider = null;
  providersByType.clear();
};

/**
 * Gets the current factory configuration
 */
const getFactoryConfig = (): ProviderFactoryConfig => {
  return { ...factoryConfig };
};

/**
 * Factory object with all provider factory functions
 */
export const createProviderFactory = () => {
  return {
    updateConfig: updateFactoryConfig,
    getProvider,
    getAvailableProviders,
    clearCache: clearProviderCache,
    getConfig: getFactoryConfig,
  };
};

// Backward compatibility - Class wrapper around functional implementation
export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private factory = createProviderFactory();

  private constructor() {
    // Initialization is handled by the functional implementation
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /**
   * Update factory configuration
   */
  updateConfig(config: Partial<ProviderFactoryConfig>): void {
    this.factory.updateConfig(config);
  }

  /**
   * Get the current provider based on configuration
   */
  async getProvider(): Promise<AIProvider> {
    return this.factory.getProvider();
  }

  /**
   * Get list of all available providers
   */
  async getAvailableProviders(): Promise<Array<{ name: string; available: boolean }>> {
    return this.factory.getAvailableProviders();
  }

  /**
   * Clear cached provider (forces re-selection on next getProvider call)
   */
  clearCache(): void {
    this.factory.clearCache();
  }
}

/**
 * The provider a resolved model choice runs on (lib/ai/model-resolver).
 * One cached instance per provider type.
 */
export async function getProviderFor(type: ModelProvider): Promise<AIProvider> {
  const cached = providersByType.get(type);
  if (cached) return cached;
  let provider: AIProvider;
  switch (type) {
    case 'mock':
      provider = (await import('./providers/mock')).createMockProvider();
      break;
    case 'openai':
      provider = (await import('./providers/openai')).createOpenAIProvider();
      break;
    case 'ollama':
      provider = createOllamaProvider();
      break;
    case 'openrouter':
      // The app-wide provider, so the auto fallback chain still applies.
      provider = await getAIProvider();
      break;
  }
  providersByType.set(type, provider);
  return provider;
}

/**
 * Convenience function to get the current AI provider
 */
export async function getAIProvider(): Promise<AIProvider> {
  return getProvider();
}

/**
 * Get a snapshot of the current provider factory configuration for monitoring
 */
export function getFactoryConfigSnapshot() {
  return {
    configuredProvider: factoryConfig.provider,
    fallbackOrder:
      factoryConfig.provider === 'auto' ? [...AUTO_FALLBACK_ORDER] : [factoryConfig.provider],
    providers: [] as Array<{ name: string; available: boolean }>,
  };
}
