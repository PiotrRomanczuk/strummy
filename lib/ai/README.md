---
created: 2026-05-14
updated: 2026-05-14
---

# Strummy AI System

Architecture reference for the `lib/ai/` subsystem: agent registry, provider layer, rate limiting, cost tracking, and security model.

---

## Architecture Overview

```
AgentRequest
     │
     ▼
┌─────────────────────────────────────────────┐
│              registry/core.ts               │
│  1. Agent lookup (Map<id, spec>)            │
│  2. Input validation (allowed fields, max   │
│     length, sensitive-data handling)        │
│  3. Permission check (role vs targetUsers)  │
│  4. Rate-limit check (Supabase RPC)         │
│  5. prepareContext → fetchContextData       │
│  6. executeAgent → provider.complete()      │
│  7. sanitizeOutput                          │
│  8. logExecution (DB + in-memory)           │
└─────────────────────────────────────────────┘
     │
     ▼
┌─────────────────┐     ┌──────────────────────┐
│ provider-factory│     │ circuit-breaker.ts   │
│ (auto | openr.. │────▶│ 5 errors / 30s →    │
│  | ollama)      │     │ 60 s cooldown        │
└─────────────────┘     └──────────────────────┘
     │
     ├── OpenRouter (Vercel AI SDK adapter, or fetch fallback)
     └── Ollama        (local, dev only)
```

On every `executeAgentRequest` call the core module runs the steps in the order shown above. A failure at any step short-circuits execution and returns an `AgentResponse` with `success: false` and a typed error code. If a fallback template is configured for the agent it is attached to the response as `{ content, isFallback: true }`.

---

## How to Add a New Agent

### Step 1 — Create the spec file

Add `lib/ai/agents/<name>.ts`. Export a single `const` typed as `AgentSpecification`:

```typescript
import type { AgentSpecification } from '../agent-registry';

export const myNewAgent: AgentSpecification = {
  id: 'my-new-agent', // kebab-case, unique across registry
  name: 'My New Agent',
  description: 'One-line description for admin UIs',
  version: '1.0.0',

  purpose: 'What this agent does and why',
  targetUsers: ['teacher'], // 'admin' | 'teacher' | 'student' | 'system'
  useCases: ['Use case A', 'Use case B'],
  limitations: ['Cannot do X'],

  systemPrompt: `You are ...`,
  temperature: 0.4, // 0 = deterministic, 1+ = creative
  maxTokens: 600,
  model: 'meta-llama/llama-3.3-70b-instruct:free',

  fallbackTemplate: '## Fallback\nAI is unavailable. ...', // optional

  requiredContext: ['currentStudent'], // fetched and injected automatically
  optionalContext: ['recentLessons'], // failures are non-blocking

  dataAccess: {
    tables: ['students', 'lessons'],
    permissions: ['read'],
  },

  inputValidation: {
    maxLength: 1000,
    allowedFields: ['prompt', 'notes'],
    sensitiveDataHandling: 'sanitize', // 'block' | 'sanitize' | 'allow'
  },

  enableLogging: true,
  enableAnalytics: true,
  successMetrics: ['metric_name'],

  uiConfig: {
    category: 'content', // 'content' | 'analysis' | 'automation' | 'communication' | 'assistant'
    icon: 'FileText', // Lucide icon name
    placement: ['modal'], // 'dashboard' | 'modal' | 'inline' | 'sidebar'
    loadingMessage: 'Generating...',
    errorMessage: 'Could not generate. Please try again.',
  },
};
```

### Step 2 — Register it

In `lib/ai/agents/index.ts`, import and register:

```typescript
import { myNewAgent } from './my-new-agent';

export function registerAllAgents(): void {
  // ... existing registrations
  registerAgent(myNewAgent);
}
```

Export it from the named exports and the relevant category group at the bottom of the file.

### Step 3 — Add a fallback template (optional but recommended)

If the agent should degrade gracefully when providers are down, either set `fallbackTemplate` directly in the spec, or add an entry to `AGENT_FALLBACK_TEMPLATES` in `registry/core.ts`. The spec-level `fallbackTemplate` takes precedence over the registry map.

### Step 4 — Write unit tests

Add `lib/ai/agents/__tests__/my-new-agent.test.ts`. Verify:

- The spec passes `validateSpecification` without throwing.
- Temperature is within the intended range.
- `allowedFields` covers every field the calling code sends.

---

## AgentSpecification Contract

| Field                                   | Type                                                | Required | Notes                                                                                                     |
| --------------------------------------- | --------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `id`                                    | `string`                                            | Yes      | Unique kebab-case identifier. Used as DB `agent_id` and registry key.                                     |
| `name`                                  | `string`                                            | Yes      | Human-readable label for admin UIs.                                                                       |
| `description`                           | `string`                                            | Yes      | One-line summary.                                                                                         |
| `version`                               | `string`                                            | Yes      | Semver string. Not enforced by the runtime; informational.                                                |
| `purpose`                               | `string`                                            | Yes      | Longer statement of intent.                                                                               |
| `targetUsers`                           | `('admin' \| 'teacher' \| 'student' \| 'system')[]` | Yes      | Minimum one entry. Enforced by `checkPermissions`.                                                        |
| `useCases`                              | `string[]`                                          | Yes      | Minimum one entry. Enforced by `validateSpecification`.                                                   |
| `limitations`                           | `string[]`                                          | No       | Advisory; shown in admin UI.                                                                              |
| `systemPrompt`                          | `string`                                            | Yes      | Full system prompt injected before any context data.                                                      |
| `temperature`                           | `number`                                            | Yes      | Must be 0–2. 0.3–0.5 for structured output; 0.7 for conversational.                                       |
| `maxTokens`                             | `number`                                            | No       | Defaults to provider max when omitted.                                                                    |
| `model`                                 | `string`                                            | No       | OpenRouter model ID. Defaults to `DEFAULT_AI_MODEL`. Mapped to an Ollama equivalent when running locally. |
| `fallbackTemplate`                      | `string`                                            | No       | Markdown returned when the provider fails. Agent-level value overrides the registry map.                  |
| `outputSchema`                          | `unknown`                                           | No       | Reserved for Zod output validation. Not yet enforced by the runtime.                                      |
| `requiredContext`                       | `string[]`                                          | Yes      | Context keys that must be fetched before execution. A fetch failure aborts the request.                   |
| `optionalContext`                       | `string[]`                                          | Yes      | Context keys fetched on a best-effort basis. Failures are logged as warnings and set to `null`.           |
| `dataAccess.tables`                     | `string[]`                                          | No       | Declarative list of tables the agent reads from. Not enforced by the runtime; used for auditing.          |
| `dataAccess.permissions`                | `('read' \| 'write')[]`                             | Yes      | Minimum one entry.                                                                                        |
| `inputValidation.maxLength`             | `number`                                            | Yes      | Per-field character limit applied to all `allowedFields`.                                                 |
| `inputValidation.allowedFields`         | `string[]`                                          | Yes      | Only these keys are forwarded from the caller's input. Unknown keys are rejected (HTTP 400).              |
| `inputValidation.sensitiveDataHandling` | `'block' \| 'sanitize' \| 'allow'`                  | Yes      | `block` throws on PII patterns; `sanitize` redacts them; `allow` passes through.                          |
| `enableLogging`                         | `boolean`                                           | Yes      | When `true`, each execution is written to `agent_execution_logs` in Supabase.                             |
| `enableAnalytics`                       | `boolean`                                           | Yes      | When `true`, the in-memory execution log is updated (capped at 100 entries).                              |
| `successMetrics`                        | `string[]`                                          | Yes      | Advisory metric names; not yet wired to a metrics backend.                                                |
| `uiConfig.category`                     | `string`                                            | Yes      | Groups agents in the admin panel.                                                                         |
| `uiConfig.icon`                         | `string`                                            | Yes      | Lucide icon name rendered next to the agent.                                                              |
| `uiConfig.placement`                    | `string[]`                                          | Yes      | Where the agent surface appears.                                                                          |
| `uiConfig.loadingMessage`               | `string`                                            | No       | Shown in the UI while the request is in flight.                                                           |
| `uiConfig.errorMessage`                 | `string`                                            | No       | Shown in the UI on failure.                                                                               |

---

## Registered Agents

| ID                          | Category      | Target users   | Description                                 |
| --------------------------- | ------------- | -------------- | ------------------------------------------- |
| `chat-assistant`            | assistant     | admin, teacher | General guitar school Q&A, pedagogy, theory |
| `lesson-notes-assistant`    | content       | admin, teacher | Generates structured lesson notes           |
| `assignment-generator`      | content       | admin, teacher | Creates practice assignments for students   |
| `post-lesson-summary`       | content       | admin, teacher | Post-lesson summary for teacher records     |
| `email-draft-generator`     | communication | admin, teacher | Drafts parent/student communication emails  |
| `student-progress-insights` | analysis      | admin, teacher | Analyses a student's lesson history         |
| `admin-dashboard-insights`  | analysis      | admin          | Business-level insights across all students |
| `song-normalization`        | automation    | system         | Normalises raw song data for DB consistency |
| `song-notes`                | content       | admin, teacher | Adds teaching notes to a song entry         |

---

## Provider Strategy

The provider layer is controlled by two environment variables:

| Variable          | Values                         | Default                 |
| ----------------- | ------------------------------ | ----------------------- |
| `AI_PROVIDER`     | `openrouter`, `ollama`, `auto` | `auto`                  |
| `AI_PREFER_LOCAL` | `true`, `false`                | `true` (in `auto` mode) |

### `auto` mode (default)

1. If `AI_PREFER_LOCAL=true` (default) and Ollama is healthy (circuit breaker not tripped), try Ollama first.
2. If Ollama is unavailable or unhealthy, try OpenRouter.
3. If OpenRouter is also unavailable, fall back to OpenRouter anyway (the provider returns an error to the caller).

### OpenRouter

Primary cloud provider. Uses the Vercel AI SDK adapter (`providers/vercel-ai-adapter.ts`) by default. Set `AI_USE_VERCEL_SDK=false` to force the custom fetch-based implementation in `providers/openrouter.ts`. Requires `OPENROUTER_API_KEY`.

### Ollama

Local inference. Used in development to avoid API costs. Model names are mapped from OpenRouter identifiers to Ollama equivalents in `lib/ai/model-mappings.ts`. No API key required.

### Provider cache

`provider-factory.ts` caches the resolved provider in a module-level variable after the first call. Calling `clearProviderCache()` (or `AIProviderFactory.getInstance().clearCache()`) forces re-resolution on the next request. The legacy class wrapper (`AIProviderFactory`) delegates to the same functional implementation.

---

## Circuit Breaker

`provider-circuit-breaker.ts` tracks errors per provider using a sliding window:

- Window: 30 seconds
- Threshold: 5 errors within the window trips the breaker
- Cooldown: 60 seconds before the provider is tried again

`auto` mode checks `isProviderHealthy(name)` before attempting each provider. A tripped breaker causes the factory to skip that provider and try the next one. Successes do not reset the cooldown mid-window; the timer expires naturally.

---

## Rate Limiter

`rate-limiter.ts` enforces two simultaneous ceilings per request:

### Per-agent limit (role-based)

| Role      | Requests / minute |
| --------- | ----------------- |
| admin     | 100               |
| teacher   | 50                |
| student   | 20                |
| anonymous | 5                 |

Key format: `rl:<userId>:<agentId>`

### Per-user aggregate limit

| Role      | Total requests / minute (across all agents) |
| --------- | ------------------------------------------- |
| admin     | 300                                         |
| teacher   | 150                                         |
| student   | 60                                          |
| anonymous | 15                                          |

Key format: `rl:<userId>:__aggregate`

Both counters are incremented in parallel via the `increment_rate_limit` Supabase RPC function, which atomically increments and returns the window state. This makes the limiter correct across Vercel Fluid Compute instances (no sticky sessions). If the RPC call fails (Supabase unavailable), the implementation falls back to an in-memory `Map` on the same process instance.

When either ceiling is exceeded, `checkRateLimit` returns `allowed: false` with a `retryAfter` value in seconds. The registry core throws `RateLimitError` and the caller receives a response with error code `RATE_LIMITED`.

Rate-limit checks happen **after** input validation so that malformed input does not consume quota.

---

## Cost Tracking

`pricing.ts` holds a `MODEL_PRICING` table mapping OpenRouter model IDs to prompt and completion costs per 1,000 tokens. All currently registered agents use free-tier models, so all costs compute to `$0.00`.

`computeCostUsd(modelId, promptTokens, completionTokens)` returns the USD cost as a `number`. This value is written to the `cost_usd` column in `agent_execution_logs` on every execution. When the prompt/completion token split is not available in the metadata (currently the case), `totalTokens` is used as the completion proxy and `promptTokens` is set to 0.

To add a paid model, add its entry to `MODEL_PRICING` with non-zero rates before deploying agents that use it.

---

## Security Model

### Input validation

`registry/validation.ts` enforces four checks in order:

1. **Allowed fields** — any key not listed in `inputValidation.allowedFields` causes an immediate `ValidationError`. The caller receives HTTP 400.
2. **Max length** — each allowed field is checked against `inputValidation.maxLength`. Exceeding it raises `ValidationError`.
3. **Sensitive data** — governed by `inputValidation.sensitiveDataHandling`:
   - `block`: regex patterns for credit card numbers, SSNs, and emails are tested; a match throws `ValidationError`.
   - `sanitize`: matching values are redacted in-place (last-4 digits kept for card numbers; first character kept for emails).
   - `allow`: no PII filtering.

### Prompt injection mitigation (`registry/execution.ts`)

Context injected into system prompts is hardened with two complementary mechanisms:

**Nonce delimiters (F-19):** A 12-character random hex nonce is generated per request. Context blocks are wrapped in delimiter strings that include this nonce (`--- BEGIN CONTEXT DATA <nonce> ---`). Any injected content that contains a matching delimiter pattern is stripped before injection, making it difficult for user-controlled data to escape the context block.

**Content sanitization (`sanitizeContextValue`):** Applied to every context value before injection and to every user input field before it is appended to the user message:

- Unicode normalization (NFC)
- Role-boundary markers stripped (`SYSTEM:`, `USER:`, `ASSISTANT:`, `HUMAN:`)
- LLM special tokens stripped (`<|im_start|>`, `<|endoftext|>`, `[INST]`, etc.)
- Triple backticks replaced with single quotes to prevent code-block breakout
- `javascript:`, `data:`, and `vbscript:` URL schemes in Markdown links neutralized
- `<script>` tags and inline event handlers stripped
- Values truncated to 5,000 characters

**Output sanitization (F-20):** The raw result from the provider also passes through `sanitizeOutput`, which strips role markers and LLM special tokens from the `content` field before the response is returned to the caller.

### Permission check

`checkPermissions` verifies that the caller's `userRole` appears in `AgentSpecification.targetUsers`. A mismatch raises `PermissionError` (code `PERMISSION_DENIED`).

---

## Error Types

All AI errors are typed classes in `lib/ai/errors.ts`. Use `instanceof` checks — never string-match on `error.message`.

| Class                | Code                | When thrown                                             |
| -------------------- | ------------------- | ------------------------------------------------------- |
| `AgentNotFoundError` | `AGENT_NOT_FOUND`   | Registry lookup returns nothing for the given `agentId` |
| `RateLimitError`     | `RATE_LIMITED`      | Per-agent or aggregate limit exceeded                   |
| `ValidationError`    | `VALIDATION_ERROR`  | Bad input field, over-length, or blocked PII            |
| `PermissionError`    | `PERMISSION_DENIED` | Caller's role not in `targetUsers`                      |
| `ContextError`       | `CONTEXT_ERROR`     | Required context key could not be fetched               |
| `ProviderError`      | `PROVIDER_ERROR`    | AI provider returned an error or was unavailable        |
| `TimeoutError`       | `TIMEOUT`           | Request exceeded the configured timeout                 |

`getErrorCode(error: unknown)` safely extracts the `.code` string from any of the above or returns `EXECUTION_FAILED` for untyped errors. The registry core uses this to populate `AgentResponse.error.code`.

Error categories for structured logging are resolved by `categorizeError` in `registry/analytics.ts` using the same `instanceof` pattern.

---

## Logging and Analytics

### Structured operation log

Every `executeAgentRequest` call emits a structured log entry via `logAIOperation` (regardless of success or failure). Fields include: `agentId`, `provider`, `model`, `latencyMs`, `success`, `errorCategory`, `tokenCount`, `userId`.

### Database persistence

On successful execution (and on failure if `enableLogging` is `true`), a row is inserted into `agent_execution_logs` with: `agent_id`, `request_id`, `user_id`, `user_role`, `successful`, `execution_time`, `input_hash`, `error_code`, `model_used`, `provider_used`, `tokens_used`, `cost_usd`, `timestamp`, `session_id`, `entity_type`, `entity_id`.

The first DB write failure per process lifetime is logged at ERROR level; subsequent failures are demoted to WARN to prevent log spam.

### In-memory log

Up to 100 recent `AgentResponse` objects are kept in a module-level array for the lifetime of the process. `getAnalytics(agentId?)` computes `successRate`, `averageExecutionTime`, and `errorDistribution` from this buffer without hitting the database.
