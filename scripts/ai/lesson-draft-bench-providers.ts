/**
 * Model clients for lesson-draft-bench.ts. A model id prefixed "ollama/"
 * goes to the local Ollama (OLLAMA_URL, default the wfh box on the LAN);
 * anything else goes to OpenRouter.
 */

export type CallResult = {
  httpStatus: number;
  retries: number;
  jsonMode: boolean;
  latencyMs: number;
  content: string;
  reasoningChars: number;
  finishReason: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  providerModel: string | null;
  error: { code?: number; message?: string; metadata?: { raw?: string } } | null;
};

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.1.10:11434';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Completion = {
  choices?: { message?: { content?: string; reasoning?: string }; finish_reason?: string }[];
  usage?: CallResult['usage'];
  model?: string;
  error?: CallResult['error'];
};

async function openRouterRequest(model: string, system: string, user: string, withJsonMode: boolean) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 12000,
      reasoning: { effort: 'low' },
      ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Completion };
}

/** Retries shared-pool rate limits and drops JSON mode when a provider rejects it. */
async function callOpenRouter(model: string, system: string, user: string, json: boolean): Promise<CallResult> {
  const started = Date.now();
  let withJsonMode = json;
  let tries = 0;
  let res = await openRouterRequest(model, system, user, withJsonMode);
  while (tries < 3 && (res.status === 429 || (res.status === 400 && withJsonMode))) {
    tries += 1;
    if (res.status === 400) withJsonMode = false;
    else await sleep(30_000 * tries);
    res = await openRouterRequest(model, system, user, withJsonMode);
  }
  const choice = res.body?.choices?.[0];
  return {
    httpStatus: res.status,
    retries: tries,
    jsonMode: withJsonMode,
    latencyMs: Date.now() - started,
    content: String(choice?.message?.content ?? ''),
    reasoningChars: choice?.message?.reasoning?.length ?? 0,
    finishReason: choice?.finish_reason ?? null,
    usage: res.body?.usage ?? null,
    providerModel: res.body?.model ?? null,
    error: res.body?.error ?? null,
  };
}

type OllamaChat = {
  message?: { content?: string; thinking?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  model?: string;
  error?: string;
};

/** Native /api/chat: the OpenAI-compatible route ignores num_ctx and silently truncates long transcripts. */
async function callOllama(model: string, system: string, user: string, json: boolean): Promise<CallResult> {
  const started = Date.now();
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      ...(json ? { format: 'json' } : {}),
      think: process.env.OLLAMA_THINK === 'true',
      options: { temperature: 0.2, num_ctx: 16384, num_predict: 6000 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(45 * 60_000),
  });
  const body = (await res.json().catch(() => ({}))) as OllamaChat;
  return {
    httpStatus: res.status,
    retries: 0,
    jsonMode: json,
    latencyMs: Date.now() - started,
    content: String(body.message?.content ?? ''),
    reasoningChars: body.message?.thinking?.length ?? 0,
    finishReason: body.done_reason ?? null,
    usage: { prompt_tokens: body.prompt_eval_count, completion_tokens: body.eval_count },
    providerModel: body.model ?? null,
    error: body.error ? { message: body.error } : null,
  };
}

/** json=true asks the provider for a JSON object (structured agents); false for plain-text agents. */
export function callModel(model: string, system: string, user: string, json = true): Promise<CallResult> {
  return model.startsWith('ollama/')
    ? callOllama(model.slice('ollama/'.length), system, user, json)
    : callOpenRouter(model, system, user, json);
}

export async function printQuota(models: string[]): Promise<void> {
  if (!models.some((m) => !m.startsWith('ollama/'))) return;
  const res = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
  });
  const info = ((await res.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data ?? {};
  const { usage, limit, is_free_tier: isFreeTier, rate_limit: rateLimit } = info;
  console.log('openrouter key:', JSON.stringify({ usage, limit, isFreeTier, rateLimit }));
}
