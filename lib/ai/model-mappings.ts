/**
 * AI Model Mappings Configuration
 *
 * Centralized configuration for mapping models between different providers
 */

export interface ModelMapping {
  openrouterModel: string;
  ollamaModel: string;
  description?: string;
}

/**
 * Centralized model mappings between OpenRouter and Ollama
 */
export const MODEL_MAPPINGS: ModelMapping[] = [
  {
    openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    ollamaModel: 'llama3.2:3b',
    description: 'Llama 3.x family mapping',
  },
  {
    openrouterModel: 'meta-llama/llama-3.2-3b-instruct:free',
    ollamaModel: 'llama3.2:3b',
    description: 'Llama 3.2 3B',
  },
  {
    openrouterModel: 'meta-llama/llama-3.2-1b-instruct:free',
    ollamaModel: 'llama3.2:1b',
    description: 'Llama 3.2 1B',
  },
  {
    openrouterModel: 'google/gemini-2.0-flash-exp:free',
    ollamaModel: 'mistral:7b',
    description: 'Gemini to Mistral mapping',
  },
  {
    openrouterModel: 'google/gemma-3-27b-it:free',
    ollamaModel: 'gemma2:27b',
    description: 'Gemma 3 mapping',
  },
  {
    openrouterModel: 'mistralai/mistral-7b-instruct:free',
    ollamaModel: 'mistral:7b',
    description: 'Mistral 7B',
  },
];

/**
 * Default fallback models for each provider.
 *
 * AIA-1: ollama previously pointed at 'llama3.2:3b', which crashes the
 * runner on the home Ollama host (exit status 2) — any unmapped model id
 * sent to the local provider died at the fallback. 'gemma3:1b' is the only
 * model confirmed usable at the box's current (CPU-bound) inference speed;
 * override via OLLAMA_DEFAULT_MODEL once the GPU backend is fixed.
 */
export const FALLBACK_MODELS = {
  ollama: 'gemma3:1b',
  openrouter: 'meta-llama/llama-3.2-3b-instruct:free',
};

/**
 * Normalise an OpenRouter model id before it goes over the wire.
 *
 * OpenRouter retired the `:free` endpoints these ids were pinned to, so every
 * request started failing with "This model is unavailable for free" / "No :free
 * endpoints available for any resolved models". Stripping the suffix resolves
 * to the same model on the paid tier — which is billable, so it is opt-out via
 * `OPENROUTER_ALLOW_PAID=false` for anyone who wants to keep the old behaviour
 * and see the failure loudly instead.
 *
 * The `:free` literals are left in place across the model catalogues on purpose:
 * they still describe intent, and normalising in one place beats keeping 40+
 * string literals in sync.
 */
export function resolveOpenRouterModel(model: string): string {
  if (process.env.OPENROUTER_ALLOW_PAID === 'false') return model;
  return model.endsWith(':free') ? model.slice(0, -':free'.length) : model;
}

/**
 * Map an OpenRouter model to its Ollama equivalent
 */
export function mapToOllamaModel(openrouterModel: string): string {
  // A local Ollama host only serves the models that are actually pulled. When
  // OLLAMA_DEFAULT_MODEL is set, honor it for every request — the static
  // OpenRouter→Ollama table can otherwise resolve to a model that isn't
  // installed (e.g. llama3.2:3b), causing 404s from Ollama.
  const envDefault = process.env.OLLAMA_DEFAULT_MODEL;
  if (envDefault) return envDefault;

  const mapping = MODEL_MAPPINGS.find((m) => m.openrouterModel === openrouterModel);
  return mapping?.ollamaModel || FALLBACK_MODELS.ollama;
}

/**
 * Map an Ollama model to its OpenRouter equivalent
 */
export function mapToOpenRouterModel(ollamaModel: string): string {
  const mapping = MODEL_MAPPINGS.find((m) => m.ollamaModel === ollamaModel);
  return mapping?.openrouterModel || FALLBACK_MODELS.openrouter;
}

/**
 * Get all available model mappings
 */
export function getAllModelMappings(): ModelMapping[] {
  return [...MODEL_MAPPINGS];
}

/**
 * Add a custom model mapping
 */
export function addModelMapping(mapping: ModelMapping): void {
  // Check if mapping already exists
  const existingIndex = MODEL_MAPPINGS.findIndex(
    (m) => m.openrouterModel === mapping.openrouterModel || m.ollamaModel === mapping.ollamaModel
  );

  if (existingIndex >= 0) {
    MODEL_MAPPINGS[existingIndex] = mapping;
  } else {
    MODEL_MAPPINGS.push(mapping);
  }
}
