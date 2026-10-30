/**
 * Model resolver — the one place that decides which provider and model an
 * AI agent runs on (2026-10-22). Agents carry no model of their own; every
 * execution path (registry, streaming, structured output, plain text) asks
 * here, so a model change is an env change, never an edit in every agent.
 *
 * A model spec is `provider:model`, e.g. `ollama:gemma4:12b` or
 * `openrouter:nvidia/nemotron-3.5-super-vl:free`. A spec without a known
 * provider prefix is an OpenRouter id (that is what the legacy envs hold).
 *
 * Precedence for an agent:
 *   1. AI_PROVIDER=mock|openai|ollama|openrouter — global override used by
 *      E2E/test tooling; pins the provider (and its own default model).
 *   2. AI_MODEL_<AGENT_ID> — e.g. AI_MODEL_SONG_NORMALIZATION=ollama:gemma4:12b
 *   3. Legacy per-agent envs (LESSON_DRAFT_MODEL, LESSON_SUMMARY_MODEL)
 *   4. AI_MODEL — default for every agent
 *   5. DEFAULT_MODEL_SPEC
 */
import { DEFAULT_AI_MODEL } from '@/lib/ai-models';
import { pinnedOpenAIModel } from './providers/openai';

export const MODEL_PROVIDERS = ['openrouter', 'ollama', 'openai', 'mock'] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export interface ModelChoice {
  provider: ModelProvider;
  model: string;
}

/** The free model that works on production (benchmarked 2026-10-21). */
export const DEFAULT_MODEL_SPEC = `openrouter:${DEFAULT_AI_MODEL}`;

/** Used when Ollama is forced via AI_PROVIDER without OLLAMA_DEFAULT_MODEL. */
const OLLAMA_FALLBACK_MODEL = 'gemma3:1b';

/** Pre-resolver envs, still honoured so production keeps its model until AI_MODEL is set. */
const LEGACY_AGENT_ENVS: Record<string, string[]> = {
  'lesson-transcript-draft': ['LESSON_DRAFT_MODEL'],
  'post-lesson-summary': ['LESSON_SUMMARY_MODEL', 'LESSON_DRAFT_MODEL'],
};

const isModelProvider = (value: string | undefined): value is ModelProvider =>
  !!value && (MODEL_PROVIDERS as readonly string[]).includes(value);

export function parseModelSpec(spec: string): ModelChoice {
  const trimmed = spec.trim();
  const separator = trimmed.indexOf(':');
  const prefix = separator > 0 ? trimmed.slice(0, separator) : undefined;
  if (isModelProvider(prefix)) return { provider: prefix, model: trimmed.slice(separator + 1) };
  return { provider: 'openrouter', model: trimmed };
}

export const formatModelChoice = (choice: ModelChoice): string => `${choice.provider}:${choice.model}`;

/** `song-normalization` → `AI_MODEL_SONG_NORMALIZATION` */
export const agentModelEnvKey = (agentId: string): string =>
  `AI_MODEL_${agentId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;

function configuredSpec(agentId?: string): string {
  const keys = agentId ? [agentModelEnvKey(agentId), ...(LEGACY_AGENT_ENVS[agentId] ?? [])] : [];
  for (const key of [...keys, 'AI_MODEL']) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return DEFAULT_MODEL_SPEC;
}

function forcedChoice(provider: ModelProvider, configured: ModelChoice): ModelChoice {
  switch (provider) {
    case 'mock':
      return { provider, model: 'mock-model' };
    case 'openai':
      return { provider, model: pinnedOpenAIModel() };
    case 'ollama': {
      const fromSpec = configured.provider === 'ollama' ? configured.model : undefined;
      return { provider, model: process.env.OLLAMA_DEFAULT_MODEL || fromSpec || OLLAMA_FALLBACK_MODEL };
    }
    case 'openrouter':
      return configured.provider === 'openrouter' ? configured : parseModelSpec(DEFAULT_MODEL_SPEC);
  }
}

/** Provider + model for an agent (or for the app default when no agent id is given). */
export function resolveModel(agentId?: string): ModelChoice {
  const configured = parseModelSpec(configuredSpec(agentId));
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  return isModelProvider(forced) ? forcedChoice(forced, configured) : configured;
}
