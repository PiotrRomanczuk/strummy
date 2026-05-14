# ADR-002: AI Provider Strategy

**Date**: 2026-05-14
**Status**: Accepted
**Deciders**: Piotr Romanczuk

## Context

Strummy needs to call large language models to power nine agents (lesson notes, assignments, chat assistant, song normalization, etc.). The system runs on Vercel (serverless, Fluid Compute) in production and on a developer laptop in local development.

Two providers were evaluated:

- **OpenRouter** — cloud API aggregator that proxies requests to dozens of models (Llama, Gemini, DeepSeek, etc.) under a single API key. Offers free-tier models at $0/1K tokens. Supports both a Vercel AI SDK adapter and a plain `fetch`-based client.
- **Ollama** — local inference runtime. Models run on the developer's machine; no API key or network call required. Supported models differ from OpenRouter's identifiers and must be mapped.

A third path — direct model-provider APIs (OpenAI, Anthropic, Google) — was considered but rejected because it would require multiple API keys, separate billing accounts, and separate SDK integrations for a solo project at this scale.

## Decision

**OpenRouter is the primary (production) provider. Ollama is the secondary (local-development) provider.**

The provider is selected at startup by `lib/ai/provider-factory.ts` according to the `AI_PROVIDER` environment variable:

| `AI_PROVIDER` value | Behaviour                                                                     |
| ------------------- | ----------------------------------------------------------------------------- |
| `openrouter`        | Always use OpenRouter                                                         |
| `ollama`            | Always use Ollama                                                             |
| `auto` (default)    | Try Ollama first if `AI_PREFER_LOCAL=true` (default); fall back to OpenRouter |

In `auto` mode the factory also consults the circuit breaker (`provider-circuit-breaker.ts`) before attempting a provider. A provider that has tripped the breaker (5 errors in 30 seconds) is skipped for a 60-second cooldown window.

OpenRouter uses the Vercel AI SDK adapter by default (`AI_USE_VERCEL_SDK=true`). Setting `AI_USE_VERCEL_SDK=false` reverts to the custom `fetch`-based provider, which is useful in test environments where `TransformStream` may be unavailable.

Ollama model identifiers are mapped from OpenRouter-style names (e.g., `meta-llama/llama-3.3-70b-instruct:free`) to local equivalents via `lib/ai/model-mappings.ts`.

All currently registered agents use free-tier OpenRouter models, making the marginal cost of cloud inference $0. `pricing.ts` tracks per-model USD rates and writes a `cost_usd` value to every execution log row so cost can be tracked if paid models are introduced later.

## Consequences

**Positive**

- Single API key (`OPENROUTER_API_KEY`) covers all cloud models. Adding a new model requires only a new spec entry, not a new integration.
- Free-tier models eliminate API costs for the current agent workload.
- Local Ollama support lets developers iterate on prompts without incurring latency or cost from cloud calls.
- The circuit breaker provides automatic failover between providers without manual intervention.
- The `auto` + circuit-breaker design is transparent to agent authors; agents declare a model ID and the factory resolves the actual provider.

**Negative / trade-offs**

- OpenRouter adds a network hop and a third-party dependency. If OpenRouter is down, all cloud inference is down regardless of which underlying model is requested.
- Ollama model quality may differ from the OpenRouter equivalent; model mapping is a manual maintenance burden.
- Free-tier models on OpenRouter can be rate-limited by the provider. The Strummy-level rate limiter does not account for upstream provider quotas.
- The Vercel AI SDK adapter uses `TransformStream`, which requires careful environment handling in Jest tests (dynamic import with a try/catch fallback to the fetch provider).

**Future considerations**

- If paid models are introduced, `pricing.ts` already supports per-model USD rates and the `cost_usd` column is in place.
- Adding a third provider (e.g., direct Anthropic) would require a new provider module, a new `ProviderType` variant, and an entry in the factory switch statement. The circuit breaker is provider-name-keyed and would work without changes.
