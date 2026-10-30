import {
  agentModelEnvKey,
  DEFAULT_MODEL_SPEC,
  formatModelChoice,
  parseModelSpec,
  resolveModel,
} from './model-resolver';

const ENV_KEYS = [
  'AI_PROVIDER',
  'AI_MODEL',
  'AI_MODEL_SONG_NORMALIZATION',
  'AI_MODEL_POST_LESSON_SUMMARY',
  'LESSON_DRAFT_MODEL',
  'LESSON_SUMMARY_MODEL',
  'OLLAMA_DEFAULT_MODEL',
  'OPENAI_DEFAULT_MODEL',
];

describe('model-resolver', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('parseModelSpec', () => {
    it('splits a provider prefix and keeps colons inside the model id', () => {
      expect(parseModelSpec('ollama:gemma4:12b')).toEqual({ provider: 'ollama', model: 'gemma4:12b' });
      expect(parseModelSpec('openrouter:nvidia/nemotron-3.5-super-vl:free')).toEqual({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3.5-super-vl:free',
      });
    });

    it('treats a spec without a known prefix as an OpenRouter id', () => {
      expect(parseModelSpec('nvidia/nemotron-3.5-super-vl:free')).toEqual({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3.5-super-vl:free',
      });
      expect(parseModelSpec('  gemma4:12b ')).toEqual({ provider: 'openrouter', model: 'gemma4:12b' });
    });
  });

  it('builds the per-agent env key from the agent id', () => {
    expect(agentModelEnvKey('song-normalization')).toBe('AI_MODEL_SONG_NORMALIZATION');
  });

  it('formats a choice back into a spec', () => {
    expect(formatModelChoice({ provider: 'ollama', model: 'gemma4:12b' })).toBe('ollama:gemma4:12b');
  });

  describe('resolveModel', () => {
    it('falls back to the default spec when nothing is configured', () => {
      expect(resolveModel('assignment-generator')).toEqual(parseModelSpec(DEFAULT_MODEL_SPEC));
      expect(resolveModel()).toEqual(parseModelSpec(DEFAULT_MODEL_SPEC));
    });

    it('uses AI_MODEL for every agent', () => {
      process.env.AI_MODEL = 'ollama:gemma4:12b';
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'ollama', model: 'gemma4:12b' });
    });

    it('lets a per-agent env win over AI_MODEL', () => {
      process.env.AI_MODEL = 'openrouter:a/b:free';
      process.env.AI_MODEL_SONG_NORMALIZATION = 'ollama:qwen3.5:9b';
      expect(resolveModel('song-normalization')).toEqual({ provider: 'ollama', model: 'qwen3.5:9b' });
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'openrouter', model: 'a/b:free' });
    });

    it('keeps honouring the legacy draft and summary envs', () => {
      process.env.AI_MODEL = 'ollama:gemma4:12b';
      process.env.LESSON_DRAFT_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
      expect(resolveModel('lesson-transcript-draft')).toEqual({
        provider: 'openrouter',
        model: 'nvidia/nemotron-3.5-super-vl:free',
      });
      expect(resolveModel('post-lesson-summary').model).toBe('nvidia/nemotron-3.5-super-vl:free');

      process.env.LESSON_SUMMARY_MODEL = 'ollama:gemma4:26b';
      expect(resolveModel('post-lesson-summary')).toEqual({ provider: 'ollama', model: 'gemma4:26b' });

      process.env.AI_MODEL_POST_LESSON_SUMMARY = 'ollama:qwen3.5:9b';
      expect(resolveModel('post-lesson-summary').model).toBe('qwen3.5:9b');
    });

    it('pins the provider when AI_PROVIDER forces one', () => {
      process.env.AI_MODEL = 'ollama:gemma4:12b';

      process.env.AI_PROVIDER = 'mock';
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'mock', model: 'mock-model' });

      process.env.AI_PROVIDER = 'openai';
      process.env.OPENAI_DEFAULT_MODEL = 'gpt-4.1-nano';
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'openai', model: 'gpt-4.1-nano' });

      process.env.AI_PROVIDER = 'openrouter';
      expect(resolveModel('chat-assistant')).toEqual(parseModelSpec(DEFAULT_MODEL_SPEC));
    });

    it('forced Ollama prefers OLLAMA_DEFAULT_MODEL, then an Ollama spec, then a small fallback', () => {
      process.env.AI_PROVIDER = 'ollama';
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'ollama', model: 'gemma3:1b' });

      process.env.AI_MODEL = 'ollama:gemma4:12b';
      expect(resolveModel('chat-assistant').model).toBe('gemma4:12b');

      process.env.OLLAMA_DEFAULT_MODEL = 'qwen3.5:9b';
      expect(resolveModel('chat-assistant').model).toBe('qwen3.5:9b');
    });

    it('treats AI_PROVIDER=auto as not forcing anything', () => {
      process.env.AI_PROVIDER = 'auto';
      process.env.AI_MODEL = 'ollama:gemma4:12b';
      expect(resolveModel('chat-assistant')).toEqual({ provider: 'ollama', model: 'gemma4:12b' });
    });
  });
});
