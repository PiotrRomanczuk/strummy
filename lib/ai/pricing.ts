/**
 * AI Model Pricing
 *
 * Cost computation for AI model usage.
 * Free models are $0. Extend when paid models are added.
 */

interface ModelPricing {
  promptUsdPer1K: number;
  completionUsdPer1K: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'meta-llama/llama-3.3-70b-instruct:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
  'google/gemma-3-27b-it:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
  'google/gemini-2.0-flash-exp:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
  'meta-llama/llama-3.2-3b-instruct:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
  'deepseek/deepseek-r1:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
  'openrouter/auto:free': { promptUsdPer1K: 0, completionUsdPer1K: 0 },
};

export function computeCostUsd(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] ?? { promptUsdPer1K: 0, completionUsdPer1K: 0 };
  return (
    (promptTokens * pricing.promptUsdPer1K + completionTokens * pricing.completionUsdPer1K) / 1000
  );
}

export function getModelPricing(modelId: string): ModelPricing {
  return MODEL_PRICING[modelId] ?? { promptUsdPer1K: 0, completionUsdPer1K: 0 };
}
