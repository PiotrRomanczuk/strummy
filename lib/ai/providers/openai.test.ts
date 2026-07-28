import { createOpenAIProvider, pinnedOpenAIModel } from './openai';

describe('openai provider', () => {
  afterEach(() => {
    delete process.env.OPENAI_DEFAULT_MODEL;
  });

  it('defaults to the cheapest chat model', () => {
    expect(pinnedOpenAIModel()).toBe('gpt-4.1-nano');
  });

  it('honors OPENAI_DEFAULT_MODEL', () => {
    process.env.OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
    expect(pinnedOpenAIModel()).toBe('gpt-4o-mini');
  });

  it('points at api.openai.com and identifies as OpenAI', () => {
    const provider = createOpenAIProvider();
    expect(provider.name).toBe('OpenAI');
    expect(provider.getConfig().baseUrl).toBe('https://api.openai.com/v1');
  });

  it('lists only the pinned model', async () => {
    const models = await createOpenAIProvider().listModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('gpt-4.1-nano');
  });
});
