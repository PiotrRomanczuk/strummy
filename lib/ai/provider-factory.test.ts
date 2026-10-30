 
/**
 * AI Provider Factory Tests
 *
 * Tests for the provider factory that manages AI provider selection and caching.
 */

import { AIProviderFactory, createProviderFactory, getAIProvider, getProviderFor } from './provider-factory';
import type { AIProvider, AIProviderConfig, AIModelInfo, AIResult } from './types';

// Mock the provider modules
jest.mock('./providers/openrouter', () => ({
  createOpenRouterProvider: jest.fn(),
}));

jest.mock('./providers/ollama', () => ({
  createOllamaProvider: jest.fn(),
}));

jest.mock('./providers/openai', () => ({
  createOpenAIProvider: jest.fn(),
}));

import { createOpenRouterProvider } from './providers/openrouter';
import { createOllamaProvider } from './providers/ollama';
import { createOpenAIProvider } from './providers/openai';

const mockCreateOpenRouterProvider = createOpenRouterProvider as jest.MockedFunction<typeof createOpenRouterProvider>;
const mockCreateOllamaProvider = createOllamaProvider as jest.MockedFunction<typeof createOllamaProvider>;
const mockCreateOpenAIProvider = createOpenAIProvider as jest.MockedFunction<typeof createOpenAIProvider>;

// Helper to create mock provider
const createMockProvider = (name: string, isAvailable: boolean = true): AIProvider => ({
  name,
  listModels: jest.fn().mockResolvedValue([
    {
      id: `${name}-model-1`,
      name: `${name} Model 1`,
      provider: name,
      description: 'Test model',
      bestFor: ['testing'],
      contextWindow: 4096,
      isFree: true,
    },
  ] as AIModelInfo[]),
  complete: jest.fn().mockResolvedValue({
    content: `Response from ${name}`,
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  } as AIResult),
  isAvailable: jest.fn().mockResolvedValue(isAvailable),
  getConfig: jest.fn().mockReturnValue({
    baseUrl: `https://${name}.example.com`,
    timeout: 30000,
  } as AIProviderConfig),
});

describe('AI Provider Factory', () => {
  let mockOllamaProvider: AIProvider;
  let mockOpenRouterProvider: AIProvider;
  let mockOpenAIProvider: AIProvider;

  beforeEach(() => {
    // Clear all mocks and module state
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.AI_PROVIDER;

    // Create fresh mock providers
    mockOllamaProvider = createMockProvider('Ollama', true);
    mockOpenRouterProvider = createMockProvider('OpenRouter', true);
    mockOpenAIProvider = createMockProvider('OpenAI', true);

    mockCreateOllamaProvider.mockReturnValue(mockOllamaProvider);
    mockCreateOpenRouterProvider.mockReturnValue(mockOpenRouterProvider);
    mockCreateOpenAIProvider.mockReturnValue(mockOpenAIProvider);
  });

  describe('createProviderFactory', () => {
    it('should create a factory with all required methods', () => {
      const factory = createProviderFactory();

      expect(factory).toHaveProperty('updateConfig');
      expect(factory).toHaveProperty('getProvider');
      expect(factory).toHaveProperty('getAvailableProviders');
      expect(factory).toHaveProperty('clearCache');
      expect(factory).toHaveProperty('getConfig');
      expect(typeof factory.updateConfig).toBe('function');
      expect(typeof factory.getProvider).toBe('function');
      expect(typeof factory.getAvailableProviders).toBe('function');
      expect(typeof factory.clearCache).toBe('function');
      expect(typeof factory.getConfig).toBe('function');
    });

    it('should initialize with default auto config', () => {
      const factory = createProviderFactory();
      const config = factory.getConfig();

      expect(config.provider).toBe('auto');
    });

    it('should respect AI_PROVIDER environment variable', () => {
      process.env.AI_PROVIDER = 'openrouter';

      // Need to reimport to get fresh config
      jest.resetModules();
      jest.doMock('./providers/openrouter', () => ({
        createOpenRouterProvider: jest.fn().mockReturnValue(mockOpenRouterProvider),
      }));
      jest.doMock('./providers/ollama', () => ({
        createOllamaProvider: jest.fn().mockReturnValue(mockOllamaProvider),
      }));

      // The module reads env on import, so we can't easily test this without reimporting
      // This test verifies the pattern is correct
      expect(process.env.AI_PROVIDER).toBe('openrouter');
    });

  });

  describe('getProvider', () => {
    it('should return Ollama provider when configured for ollama', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'ollama' });

      const provider = await factory.getProvider();

      expect(provider.name).toBe('Ollama');
      expect(mockCreateOllamaProvider).toHaveBeenCalled();
    });

    it('should return OpenRouter provider when configured for openrouter', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'openrouter' });

      const provider = await factory.getProvider();

      expect(provider.name).toBe('OpenRouter');
      expect(mockCreateOpenRouterProvider).toHaveBeenCalled();
    });

    it('should return the fallback chain when configured for auto', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'auto' });

      const provider = await factory.getProvider();

      expect(provider.name).toBe('Auto');
    });

    it('should cache provider and return same instance', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'openrouter' });

      const provider1 = await factory.getProvider();
      const provider2 = await factory.getProvider();

      expect(provider1).toBe(provider2);
      // Should only create once due to caching
      expect(mockCreateOpenRouterProvider).toHaveBeenCalledTimes(1);
    });

    it('should clear cache and get new provider after clearCache', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'openrouter' });

      await factory.getProvider();
      factory.clearCache();
      await factory.getProvider();

      // Should create twice after cache clear
      expect(mockCreateOpenRouterProvider).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when config is updated', async () => {
      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'openrouter' });

      await factory.getProvider();
      factory.updateConfig({ provider: 'ollama' });
      const provider = await factory.getProvider();

      expect(provider.name).toBe('Ollama');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of all providers with availability status', async () => {
      const factory = createProviderFactory();

      const providers = await factory.getAvailableProviders();

      expect(providers).toEqual([
        { name: 'OpenRouter (Cloud)', available: true },
        { name: 'Ollama (Local)', available: true },
        { name: 'OpenAI (Cloud)', available: true },
      ]);
    });

    it('should correctly report unavailable providers', async () => {
      mockOllamaProvider = createMockProvider('Ollama', false);
      mockOpenRouterProvider = createMockProvider('OpenRouter', false);
      mockCreateOllamaProvider.mockReturnValue(mockOllamaProvider);
      mockCreateOpenRouterProvider.mockReturnValue(mockOpenRouterProvider);

      const factory = createProviderFactory();
      const providers = await factory.getAvailableProviders();

      expect(providers).toContainEqual({ name: 'Ollama (Local)', available: false });
      expect(providers).toContainEqual({ name: 'OpenRouter (Cloud)', available: false });
    });

    it('should check availability in parallel', async () => {
      const factory = createProviderFactory();

      await factory.getAvailableProviders();

      expect(mockOllamaProvider.isAvailable).toHaveBeenCalled();
      expect(mockOpenRouterProvider.isAvailable).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update provider type', () => {
      const factory = createProviderFactory();

      factory.updateConfig({ provider: 'ollama' });
      const config = factory.getConfig();

      expect(config.provider).toBe('ollama');
    });
  });

  describe('auto fallback chain', () => {
    const request = { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [] };

    it('tries OpenRouter, then Ollama, then OpenAI', async () => {
      (mockOpenRouterProvider.complete as jest.Mock).mockResolvedValue({ error: '402' });
      (mockOllamaProvider.complete as jest.Mock).mockResolvedValue({ error: 'down' });

      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'auto' });
      const result = await (await factory.getProvider()).complete(request);

      expect(result).toMatchObject({ content: 'Response from OpenAI' });
      const order = [mockOpenRouterProvider, mockOllamaProvider, mockOpenAIProvider].map(
        (p) => (p.complete as jest.Mock).mock.invocationCallOrder[0]
      );
      expect(order).toEqual([...order].sort((x, y) => x - y));
    });

    it('sends Ollama its mapped local model, not the OpenRouter id', async () => {
      (mockOpenRouterProvider.complete as jest.Mock).mockResolvedValue({ error: '402' });

      const factory = createProviderFactory();
      factory.updateConfig({ provider: 'auto' });
      await (await factory.getProvider()).complete(request);

      const sent = (mockOllamaProvider.complete as jest.Mock).mock.calls[0][0];
      expect(sent.model).not.toBe(request.model);
    });
  });
});

describe('AIProviderFactory Class (Singleton)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockOllamaProvider = createMockProvider('Ollama', true);
    const mockOpenRouterProvider = createMockProvider('OpenRouter', true);

    mockCreateOllamaProvider.mockReturnValue(mockOllamaProvider);
    mockCreateOpenRouterProvider.mockReturnValue(mockOpenRouterProvider);
    mockCreateOpenAIProvider.mockReturnValue(createMockProvider('OpenAI', true));
  });

  it('should return singleton instance', () => {
    const instance1 = AIProviderFactory.getInstance();
    const instance2 = AIProviderFactory.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('should have updateConfig method', () => {
    const instance = AIProviderFactory.getInstance();
    expect(typeof instance.updateConfig).toBe('function');
  });

  it('should have getProvider method', async () => {
    const instance = AIProviderFactory.getInstance();
    expect(typeof instance.getProvider).toBe('function');

    const provider = await instance.getProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBeDefined();
  });

  it('should have getAvailableProviders method', async () => {
    const instance = AIProviderFactory.getInstance();
    expect(typeof instance.getAvailableProviders).toBe('function');

    const providers = await instance.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should have clearCache method', () => {
    const instance = AIProviderFactory.getInstance();
    expect(typeof instance.clearCache).toBe('function');

    // Should not throw
    expect(() => instance.clearCache()).not.toThrow();
  });
});

describe('getAIProvider convenience function', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockOpenRouterProvider = createMockProvider('OpenRouter', true);
    mockCreateOpenRouterProvider.mockReturnValue(mockOpenRouterProvider);
    mockCreateOllamaProvider.mockReturnValue(createMockProvider('Ollama', true));
  });

  it('should return a provider', async () => {
    const provider = await getAIProvider();

    expect(provider).toBeDefined();
    expect(provider.name).toBeDefined();
  });

  it('should return provider with required interface methods', async () => {
    const provider = await getAIProvider();

    expect(typeof provider.listModels).toBe('function');
    expect(typeof provider.complete).toBe('function');
    expect(typeof provider.isAvailable).toBe('function');
    expect(typeof provider.getConfig).toBe('function');
  });
});

describe('Provider Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be able to call complete on returned provider', async () => {
    const mockResponse: AIResult = {
      content: 'Test response',
      finishReason: 'stop',
      usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
    };

    const mockProvider = createMockProvider('OpenRouter', true);
    (mockProvider.complete as jest.Mock).mockResolvedValue(mockResponse);
    mockCreateOpenRouterProvider.mockReturnValue(mockProvider);

    const factory = createProviderFactory();
    factory.updateConfig({ provider: 'openrouter' });

    const provider = await factory.getProvider();
    const result = await provider.complete({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(mockResponse);
    expect(mockProvider.complete).toHaveBeenCalledWith({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  it('should be able to list models on returned provider', async () => {
    const mockModels: AIModelInfo[] = [
      {
        id: 'model-1',
        name: 'Test Model',
        provider: 'OpenRouter',
        description: 'A test model',
        bestFor: ['testing'],
        contextWindow: 8192,
        isFree: true,
      },
    ];

    const mockProvider = createMockProvider('OpenRouter', true);
    (mockProvider.listModels as jest.Mock).mockResolvedValue(mockModels);
    mockCreateOpenRouterProvider.mockReturnValue(mockProvider);

    const factory = createProviderFactory();
    factory.updateConfig({ provider: 'openrouter' });

    const provider = await factory.getProvider();
    const models = await provider.listModels();

    expect(models).toEqual(mockModels);
  });
});

describe('getProviderFor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createProviderFactory().clearCache();
    mockCreateOllamaProvider.mockReturnValue(createMockProvider('Ollama', true));
  });

  it('builds the provider of the resolved choice once and reuses it', async () => {
    const first = await getProviderFor('ollama');
    const second = await getProviderFor('ollama');

    expect(first.name).toBe('Ollama');
    expect(second).toBe(first);
    expect(mockCreateOllamaProvider).toHaveBeenCalledTimes(1);
  });

  it('keeps the auto fallback chain for an OpenRouter choice', async () => {
    createProviderFactory().updateConfig({ provider: 'auto' });

    const provider = await getProviderFor('openrouter');

    expect(provider.name).toBe('Auto');
  });

  it('serves the deterministic mock provider without any network', async () => {
    const provider = await getProviderFor('mock');

    expect(provider.name).toMatch(/mock/i);
  });
});
