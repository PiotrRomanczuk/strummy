export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  bestFor: string[];
  contextWindow: number;
  isFree: boolean;
}

export const FREE_OPENROUTER_MODELS: AIModel[] = [
  {
    id: 'openrouter/auto:free',
    name: 'Free Models Router (Recommended)',
    provider: 'OpenRouter',
    description:
      'Automatically routes to available free models to avoid rate limits. Best reliability for production use.',
    bestFor: ['Production use', 'Rate limit avoidance', 'All general tasks', 'Automatic failover'],
    contextWindow: 128000,
    isFree: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct',
    provider: 'Meta',
    description:
      "Meta's highly capable open model, comparable to GPT-4 class models. Excellent for complex tasks.",
    bestFor: ['Complex reasoning', 'Coding', 'Creative writing', 'Nuanced instruction following'],
    contextWindow: 128000,
    isFree: true,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'Google',
    description:
      "Google's latest experimental multimodal model. Fast and capable, but may be rate-limited.",
    bestFor: ['General purpose', 'Multimodal tasks', 'Complex reasoning'],
    contextWindow: 1048576,
    isFree: true,
  },
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B Instruct',
    provider: 'Google',
    description:
      "Google's latest open model, offering improved math, reasoning, and chat capabilities.",
    bestFor: ['Reasoning', 'Math', 'Chat', 'Structured outputs'],
    contextWindow: 128000,
    isFree: true,
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B Instruct',
    provider: 'Meta',
    description:
      "A lightweight, efficient model from Meta, optimized for speed and low latency.",
    bestFor: ['Simple queries', 'Chatbots', 'Summarization', 'Fast responses'],
    contextWindow: 131072,
    isFree: true,
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct',
    provider: 'Mistral AI',
    description:
      "A high-performing, industry-standard 7B model. Reliable and fast.",
    bestFor: ['General tasks', 'Text generation', 'Basic reasoning'],
    contextWindow: 32768,
    isFree: true,
  },
  {
    id: 'qwen/qwen-2.5-vl-7b-instruct:free',
    name: 'Qwen 2.5 VL 7B Instruct',
    provider: 'Qwen',
    description:
      "A capable multimodal model from Alibaba Cloud, good for visual understanding and general text.",
    bestFor: ['Vision tasks', 'General chat', 'Multilingual support'],
    contextWindow: 32768,
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (Free)',
    provider: 'DeepSeek',
    description:
      "DeepSeek's reasoning model. Excellent for logic and code.",
    bestFor: ['Coding', 'Math', 'Complex Logic', 'Reasoning'],
    contextWindow: 163840,
    isFree: true,
  }
];

export const DEFAULT_AI_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
