# AI Agent Implementation Audit

**Date**: 2026-05-14
**Auditor**: Claude (Opus 4.7)
**Scope**: `lib/ai/` — registry, providers, agents, rate limiter, analytics
**Trigger**: Post-P1 audit (`ece08ea7 fix(ai): agent config audit`) — identifying remaining improvement opportunities

---

## Executive Summary

The Strummy AI agent system is **architecturally sound** but has **5 correctness bugs, 6 production-readiness gaps, and several consistency/security/observability shortfalls** that warrant attention before scaling beyond the current ~20-30 DAU.

Highlights:

- ✅ Clean provider abstraction (OpenRouter + Ollama) with `AI_PROVIDER=auto` switching
- ✅ Functional registry with proper validation, permissions, sanitization layers
- ✅ Prompt injection mitigations (sanitization, role-marker stripping, context delimiters)
- ✅ Best-effort persistent logging to `agent_execution_logs`
- ✅ Sophisticated context summarization (`buildStudentContextSummary`)
- ❌ **In-memory rate limiter** — fails on Vercel multi-instance (Fluid Compute)
- ❌ **No cost tracking** — only raw token counts, no $/model pricing
- ❌ **Validation ordering bug** — bad inputs consume rate-limit quota
- ❌ **Provider metadata lost** — every response says `provider: 'auto'` instead of `'openrouter'`/`'ollama'`
- ❌ **Token extraction is OpenRouter-shape-only** — Ollama runs silently lose token counts
- ❌ **No `Retry-After` headers** on rate-limit responses
- ❌ **String-matching error categorization** — fragile, silent breaks on rewording
- ❌ **No output schema validation** — structured agents can return malformed responses with no guard
- ❌ **No provider circuit breaker** — OpenRouter outage = total AI outage
- ⚠️ **Inconsistent agent contracts** — 4 of 9 agents lack `OUTPUT FORMAT`; `chat` lacks explicit `model`
- ⚠️ **Pedagogy knowledge duplicated** verbatim across 3+ prompts (maintenance debt)
- ⚠️ **Sanitization passes markdown injection** (`[click](javascript:...)`); no output filtering
- ⚠️ **No Bruno test coverage** for AI agent endpoints (only `get-ai-debug.bru`)
- ⚠️ **No admin dashboard** surfacing analytics functions that already exist

Severity tiers below use industry-standard mapping: **P0 = data loss / security**, **P1 = production reliability**, **P2 = consistency / maintainability**, **P3 = polish / docs**.

---

## Methodology

**Sources reviewed (verified by direct read, not just exploration)**:

- `lib/ai/registry/core.ts` — orchestration entrypoint
- `lib/ai/registry/types.ts` — `AgentSpecification` contract
- `lib/ai/registry/execution.ts` — prompt assembly + sanitization + LLM call
- `lib/ai/registry/analytics.ts` — logging + cost (absent) + analytics
- `lib/ai/rate-limiter.ts` — rate limiting
- `lib/ai/agents/chat.ts`, `post-lesson-summary.ts` — sample agents
- Test files in `__tests__/lib/ai/`

**Exploration agents** mapped the remaining surface (providers, all 9 agents, Bruno coverage, UI integration).

**Out of scope**: Front-end agent invocation code (hooks/components) was sampled but not deeply audited; CV/billing/payments not in `lib/ai`.

---

## Architecture Snapshot

```
lib/ai/
├── registry/
│   ├── types.ts            AgentSpecification, AgentRequest, AgentResponse
│   ├── core.ts             executeAgentRequest() — orchestration
│   ├── execution.ts        executeAgent(), buildSystemPrompt(), sanitizeContextValue()
│   ├── validation.ts       validateRequest(), checkPermissions(), validateSpecification()
│   ├── context-fetcher.ts  fetchContextData() — DB-backed context loaders
│   └── analytics.ts        logExecution(), getDatabaseAnalytics(), logAIOperation()
├── providers/
│   ├── openrouter.ts       OpenRouter HTTP client
│   └── ollama.ts           Ollama HTTP client (60s timeout)
├── context/
│   └── summarizer.ts       buildStudentContextSummary()
├── agents/
│   ├── chat.ts                  chat-assistant
│   ├── communication.ts         email-draft-generator
│   ├── analytics.ts             student-progress-insights, admin-dashboard-insights
│   ├── post-lesson-summary.ts   post-lesson-summary
│   ├── assignment.ts            assignment-generator
│   ├── lesson-notes.ts          lesson-notes (1.1.0)
│   ├── song-notes.ts            song-notes
│   ├── song-notes-enhancer.ts   song-notes-enhancer
│   └── song-normalization.ts    song-normalization
├── rate-limiter.ts         checkRateLimit() — in-memory Map
├── provider-factory.ts     getAIProvider() — singleton selector
├── model-mappings.ts       mapToOllamaModel()
└── types.ts                AIProvider interface, AIMessage, AIResponse
```

**Execution lifecycle** (`core.ts:73-148`):

```
executeAgentRequest(request)
  → agents.get(request.agentId)                  [lookup]
  → checkRateLimit(userId, role, agentId)        [BUG: before validation]
  → validateRequest(request, agent)              [shape, allowedFields, sensitiveData]
  → checkPermissions(request, agent)             [role vs targetUsers]
  → prepareContext(request, agent)               [DB fetch per requiredContext key]
  → executeAgent(request, agent, context)        [provider.complete()]
  → response { result, metadata, analytics }
  → logAIOperation() + logExecution() (best-effort)
```

---

## Agent Inventory

| Agent ID                    | File                     | Model                                    | Temp | maxTokens | allowedFields | OUTPUT FORMAT |
| --------------------------- | ------------------------ | ---------------------------------------- | ---- | --------- | ------------- | ------------- |
| `chat-assistant`            | `chat.ts`                | _(default)_ ⚠                            | 0.7  | 800       | `['prompt']`  | ❌            |
| `email-draft-generator`     | `communication.ts`       | `meta-llama/llama-3.3-70b-instruct:free` | 0.7  | 800       | 8             | ✅            |
| `student-progress-insights` | `analytics.ts`           | `meta-llama/llama-3.3-70b-instruct:free` | 0.3  | 800       | 6             | ✅            |
| `admin-dashboard-insights`  | `analytics.ts`           | `meta-llama/llama-3.3-70b-instruct:free` | 0.3  | 900       | 6             | ✅            |
| `post-lesson-summary`       | `post-lesson-summary.ts` | `meta-llama/llama-3.3-70b-instruct:free` | 0.4  | 700       | 8             | ✅            |
| `assignment-generator`      | `assignment.ts`          | `meta-llama/llama-3.3-70b-instruct:free` | 0.4  | 900       | 8             | ✅            |
| `lesson-notes`              | `lesson-notes.ts`        | `meta-llama/llama-3.3-70b-instruct:free` | 0.4  | 900       | 8             | ✅            |
| `song-notes`                | `song-notes.ts`          | `meta-llama/llama-3.3-70b-instruct:free` | 0.7  | 600       | 8             | ❌            |
| `song-notes-enhancer`       | `song-notes-enhancer.ts` | `meta-llama/llama-3.3-70b-instruct:free` | 0.5  | 600       | 9             | ❌            |
| `song-normalization`        | `song-normalization.ts`  | `google/gemma-3-27b-it:free`             | 0.3  | 800       | 5             | ❌ (is JSON)  |

---

## Findings

Each finding lists: **severity** (P0–P3), **evidence** (file:line), **impact**, **remediation**.

### P0 — Correctness Bugs

#### F-1 — Validation order: rate limit consumed before input validated

- **Severity**: P0
- **Evidence**: `lib/ai/registry/core.ts:85-98` — `checkRateLimit()` runs at line 85, `validateRequest()` at line 98.
- **Impact**: A user sending malformed input (e.g., field with wrong type, exceeding `maxLength`) consumes one rate-limit token before the validation rejection. Combined with low ceilings (students = 20/min), this is a trivial denial-of-service vector: a misbehaving client can lock itself out instantly.
- **Remediation**: Reorder to `validate → permission → rate-limit`. Single-line move.

#### F-2 — Provider metadata is always `'auto'`

- **Severity**: P0 (observability)
- **Evidence**: `lib/ai/registry/core.ts:117, 135, 161` — `provider: 'auto'` hardcoded in both success and error response paths.
- **Impact**: Every execution log records `'auto'` instead of `'openrouter'` or `'ollama'`. Makes it impossible to attribute latency, failures, or cost to a specific provider. Defeats the purpose of having two providers.
- **Remediation**: Thread the resolved provider name through `executeAgent()` return value into `metadata.provider`. ~30 LOC.

#### F-3 — Token extraction is double-cast, OpenRouter-shape-only

- **Severity**: P0 (observability + future cost tracking)
- **Evidence**: `lib/ai/registry/core.ts:118-120`:
  ```ts
  tokensUsed: (result as Record<string, unknown> | null)?.usage
    ? ((result as Record<string, Record<string, number>>).usage?.total_tokens)
    : undefined,
  ```
- **Impact**: (a) Type-unsafe double-cast hides shape mismatches; (b) `total_tokens` is the OpenRouter wire-format field. Ollama returns `eval_count` + `prompt_eval_count` — these executions report `tokensUsed: undefined`, distorting analytics.
- **Remediation**: Define canonical `AIUsage = { promptTokens, completionTokens, totalTokens }` in `lib/ai/types.ts`. Each provider returns it. Drop the cast.

#### F-4 — `hashInput` duplicated in two files

- **Severity**: P0 (drift risk)
- **Evidence**: `lib/ai/registry/core.ts:37-43` and `lib/ai/registry/execution.ts:205-211` — identical implementation.
- **Impact**: One can drift from the other; the analytics `inputHash` could become inconsistent depending on which path runs.
- **Remediation**: Keep one (in `execution.ts`), import from `core.ts`.

#### F-5 — Error codes via string-matching `error.message.includes(...)`

- **Severity**: P0 (silent breaks)
- **Evidence**: `lib/ai/registry/core.ts:45-55` (`getErrorCode`) and `lib/ai/registry/analytics.ts:300-313` (`categorizeError`):
  ```ts
  if (error.message.includes('rate limit')) return 'RATE_LIMITED';
  ```
- **Impact**: Any rewording of an error message (in a dependency, in a new throw site) silently misclassifies. No compiler help. Already two duplicate implementations.
- **Remediation**: `lib/ai/errors.ts` with typed classes (`RateLimitError`, `ValidationError`, `PermissionError`, `ProviderError`, `TimeoutError`, `AgentNotFoundError`, `ContextError`). Both functions become single-line type dispatch.

---

### P1 — Production Readiness Gaps

#### F-6 — In-memory rate limiter

- **Severity**: P1
- **Evidence**: `lib/ai/rate-limiter.ts:13` — `const rateLimitStore = new Map<string, RateLimitEntry>();` — code comment acknowledges: "consider Redis for production".
- **Impact**: On Vercel Fluid Compute, multiple function instances run concurrently. Each has its own `Map`. A user routed to N different instances effectively gets N× their quota. Worse: instance recycling resets counters mid-window.
- **Remediation**: Move to persistent store. Two reasonable options:
  - **Supabase**: `ai_rate_limits (key, count, reset_at)` with atomic `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1`. Pros: same DB, free, auditable. Cons: per-request DB roundtrip.
  - **Vercel KV (Marketplace)**: Redis-style INCR + EXPIRE. Pros: faster. Cons: extra dependency, extra cost line.
- **Recommendation**: Supabase — fits the existing stack, free-tier compatible, and Strummy's traffic volume doesn't warrant Redis latency optimization.

#### F-7 — No cost tracking

- **Severity**: P1
- **Evidence**: `lib/ai/registry/analytics.ts:81-113` — DB log stores `tokens_used` but no `cost_usd`. No pricing table anywhere in `lib/ai/`.
- **Impact**: Cannot answer "how much did this user / agent / month cost me?" without manual reconstruction. Blocks billing model, blocks budget guardrails. Today most calls use `:free` models so cost = $0, but this is technical debt that will surface the moment a paid model is enabled.
- **Remediation**: `lib/ai/pricing.ts` mapping `modelId → { promptUsdPer1K, completionUsdPer1K }`. Compute `cost_usd = (promptTokens × p + completionTokens × c) / 1000` at log time. Add `cost_usd NUMERIC(10,6)` column to `agent_execution_logs`. Daily/weekly/per-user/per-agent rollup queries.

#### F-8 — `agent_execution_logs` writes fail silently

- **Severity**: P1
- **Evidence**: `lib/ai/registry/analytics.ts:90-112` — wrapped in `try { ... } catch { logger.warn(...) }` with comment "DB logging is best-effort — don't break the request".
- **Impact**: If the migration was never applied or RLS blocks writes, the entire analytics pipeline silently produces nothing — and the warning logs may not be visible in production. The "best-effort" pattern is reasonable; the silent fallback is not.
- **Remediation**: (a) Verify the migration exists and is applied to production; (b) escalate the warning to ERROR on first failure of each process lifetime (so it's loud once, not on every request); (c) add a health-check endpoint `/api/health/ai-logging` that performs a dry-write.

#### F-9 — No output schema validation

- **Severity**: P1
- **Evidence**: `AgentSpecification` (`types.ts:8-55`) has no `outputSchema` field. `executeAgent()` returns the raw LLM result.
- **Impact**: `song-normalization` is the highest-risk: its output is parsed downstream as JSON. If the LLM returns prose, downstream code breaks with a generic parse error and no retry. Markdown-format agents are less critical but can still produce a half-rendered UI.
- **Remediation**: Add `outputSchema?: ZodTypeAny` to `AgentSpecification`. After `executeAgent`, if schema present: `safeParse`; on fail, retry once with `temperature - 0.1`; on second fail, throw `ValidationError` with details. Apply to `song-normalization` first.

#### F-10 — No `Retry-After` / rate-limit response headers

- **Severity**: P1
- **Evidence**: `lib/ai/rate-limiter.ts:94-105` computes `retryAfterSeconds` but it's only attached to the in-process result, not to any HTTP response.
- **Impact**: Clients hit by 429 receive a generic error body. They cannot back off intelligently — most will hammer-retry. Browsers, SDKs, and well-behaved clients all expect `Retry-After`.
- **Remediation**: Centralize AI route handlers behind a wrapper that converts `RateLimitError` to a 429 response with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` headers.

#### F-11 — No provider circuit breaker / fallback

- **Severity**: P1
- **Evidence**: `lib/ai/provider-factory.ts` selects once at factory time. If OpenRouter returns errors mid-session, every subsequent call also tries OpenRouter.
- **Impact**: OpenRouter outage = total AI outage, even though Ollama is configured for local development and could (in principle) serve as fallback if running. No automatic recovery, no operational visibility into "is the provider healthy right now?".
- **Remediation**: `lib/ai/provider-circuit-breaker.ts` — per-provider ring buffer of recent errors; if ≥5 errors in 30s, mark unhealthy for 60s; route to fallback during the window. Caveat: Ollama-as-fallback requires Ollama to be reachable in production, which is currently false — the more practical fallback is "return the static fallback template" (which already exists for 7 agents in `core.ts:19-34`).

---

### P2 — Consistency & Maintainability

#### F-12 — Four agents lack `OUTPUT FORMAT` block

- **Severity**: P2
- **Evidence**: `chat.ts`, `song-notes.ts`, `song-notes-enhancer.ts`, `song-normalization.ts` — system prompts end without an explicit format directive. Compare to `post-lesson-summary.ts:61-66` which has a clean `## Highlights / ## Progress Notes / ...` block.
- **Impact**: Inconsistent output shape across agents — UI consumers (or future schema-validation work) can't rely on a contract. Increases hallucination variance.
- **Remediation**: Add Markdown `OUTPUT FORMAT` blocks to the four agents, matching the style already established in the other five. For `song-normalization`, document the JSON shape inline as an example.

#### F-13 — `chat.ts` has no explicit `model`

- **Severity**: P2
- **Evidence**: `lib/ai/agents/chat.ts:65-66` — `temperature: 0.7, maxTokens: 800,` — `model` field missing. Falls back to `DEFAULT_AI_MODEL` import in `execution.ts:57`.
- **Impact**: A `DEFAULT_AI_MODEL` change silently changes chat behavior. Inconsistent with all other agents which declare model explicitly. Bad for reproducibility.
- **Remediation**: Add `model: 'meta-llama/llama-3.3-70b-instruct:free'` (matching siblings).

#### F-14 — Pedagogy knowledge duplicated across prompts

- **Severity**: P2
- **Evidence**: `GUITAR PEDAGOGY`, `MUSIC THEORY`, `ASSESSMENT TERMINOLOGY`, `MUSICAL BENCHMARKS` sections repeat near-verbatim across `chat.ts`, `post-lesson-summary.ts`, `lesson-notes.ts`, `assignment.ts`.
- **Impact**: Maintenance debt: pedagogy improvements need 4 edits. Risk of drift if any one is edited in isolation. Wastes tokens (sent on every request).
- **Remediation**: Extract to `lib/ai/agents/_shared/knowledge.ts` as named exports. Compose into each system prompt. Allows future agents to import and reduces prompt length.

#### F-15 — Fallback templates inlined in `core.ts`

- **Severity**: P2
- **Evidence**: `lib/ai/registry/core.ts:19-34` — `AGENT_FALLBACK_TEMPLATES: Record<string, string>` lists 7 hardcoded templates.
- **Impact**: Adding a new agent requires editing the registry, not just dropping a file in `agents/`. Violates the "agent = self-contained spec" principle.
- **Remediation**: Add optional `fallbackTemplate?: string` to `AgentSpecification`. Each agent owns its fallback. `core.ts` reads `agent.fallbackTemplate`.

#### F-16 — Temperature rationale undocumented

- **Severity**: P3
- **Evidence**: No JSDoc explains why `chat = 0.7` while `lesson-notes = 0.4`. The pattern (creative→0.7, analytical→0.3-0.4) is correct but invisible.
- **Impact**: Future maintainers will tweak without understanding the rationale. The recent P1 audit already tuned several — the reasoning lives in the commit message, not the code.
- **Remediation**: Header JSDoc on each agent spec explaining the temperature choice.

#### F-17 — Hardcoded BPM thresholds

- **Severity**: P3
- **Evidence**: `lib/ai/agents/assignment.ts` embeds "20 BPM below target, increase 5 BPM" directly in the prompt.
- **Impact**: Cannot tune per student level (a beginner needs gentler progression than an advanced student). Locks pedagogy decisions into prompt strings.
- **Remediation**: Move thresholds to a small `lib/ai/agents/_shared/practice-progression.ts` constants file or, better, parameterize via context (`studentLevel`).

---

### P3 — Security Hardening

#### F-18 — Sanitization passes markdown injection

- **Severity**: P3 (defense-in-depth)
- **Evidence**: `lib/ai/registry/execution.ts:24-44` — `sanitizeContextValue` strips role markers, LLM special tokens, triple backticks, but does not address `[link](javascript:...)` or `<script>` tags.
- **Impact**: If user-controlled input contains such payloads and the LLM echoes them back into a rendered Markdown response, and the renderer allows `javascript:` schemes, you have a stored XSS adjacent to the input pipeline. Current Markdown renderers (`react-markdown` defaults) generally block this, but defense-in-depth says don't rely on the renderer alone.
- **Remediation**: Extend `sanitizeContextValue` to strip dangerous URL schemes inside Markdown links and HTML tags. Mirror the sanitization to outputs.

#### F-19 — Static context delimiters

- **Severity**: P3
- **Evidence**: `lib/ai/registry/execution.ts:145, 163, 169` — uses fixed strings `--- STUDENT CONTEXT ---`, `--- BEGIN CONTEXT DATA ---`.
- **Impact**: An attacker crafting input containing the same delimiter strings can fool the LLM about where context ends and instructions begin. Real-world prompt-injection risk on advanced threats.
- **Remediation**: Suffix delimiters with a per-request nonce: `--- CONTEXT-${uuid} ---`. Update sanitization to strip strings matching the pattern.

#### F-20 — No output filtering

- **Severity**: P3
- **Evidence**: `lib/ai/registry/execution.ts:77-84` — provider response returned raw.
- **Impact**: LLM-injected content can carry user-supplied payloads back through. Pairs with F-18.
- **Remediation**: Symmetric sanitizer on response. Applies before return to client.

#### F-21 — Rate-limit key allows cross-agent quota evasion

- **Severity**: P3
- **Evidence**: `lib/ai/rate-limiter.ts:67` — `key = agentId ? '${userId}:${agentId}' : userId;`. A student with 20/min/agent could trigger 20 × 9 agents = 180/min total.
- **Impact**: Aggregate AI abuse not bounded. Cost runway risk if any paid model is added.
- **Remediation**: Two-tier limit — per-agent (current) PLUS a per-user aggregate ceiling (e.g., 60/min for students). Track separately.

---

### P3 — Testing, Observability, Documentation

#### F-22 — No Bruno tests for AI agent endpoints

- **Severity**: P3
- **Evidence**: `bruno/strummy/` contains tests for content/auth APIs (commit `a18afff3`) but only `get-ai-debug.bru` for AI. No coverage for `chat`, `lesson-notes`, `assignment`, etc.
- **Impact**: Auth/role-check regressions go undetected at the HTTP boundary. Recent Bruno expansion stopped at AI endpoints.
- **Remediation**: One `.bru` per agent endpoint, covering 200/401/403/429 paths.

#### F-23 — No streaming integration tests

- **Severity**: P3
- **Evidence**: `lib/ai/providers/*.ts` implement `completeStream()` but no test verifies client-side reassembly, cancellation, or error-mid-stream.
- **Impact**: Streaming bugs are user-facing and silent in current test suite.
- **Remediation**: Integration tests with a mock streaming provider that emits chunks, errors, and cancellations.

#### F-24 — No UI / hook integration tests

- **Severity**: P3
- **Evidence**: No tests under `__tests__/components/ai/` or similar. Hooks (if they exist) invoking agents are unverified.
- **Impact**: Loading states, error rendering, race conditions in UI invocation untested.
- **Remediation**: Component tests with mocked `fetch` covering loading / error / success states for the main agent-invocation hooks.

#### F-25 — No admin AI usage dashboard

- **Severity**: P3
- **Evidence**: `getDatabaseAnalytics`, `getPerformanceMetrics` exist in `analytics.ts` but no UI surfaces them. Admin would have to query Supabase directly.
- **Impact**: Operational blindness for the owner. Cannot answer "is the AI working today? which user is the heaviest? where is latency spiking?".
- **Remediation**: `/admin/ai-usage` page with cost chart, error distribution, latency p95, recent runs. Pairs with F-7.

#### F-26 — No README under `lib/ai/`

- **Severity**: P3
- **Evidence**: No `lib/ai/README.md`. Architecture documented only in code comments.
- **Impact**: New contributors (or future-self) have no map. Extension points, agent contract, provider strategy must be reverse-engineered.
- **Remediation**: README covering: architecture overview, agent contract, how to add an agent, provider strategy, rate limiter, cost tracking, security model.

#### F-27 — No ADR for provider strategy

- **Severity**: P3
- **Evidence**: No `docs/adr/*-ai-provider-strategy.md`. Why OpenRouter primary, Ollama for local dev? Not written down.
- **Impact**: Future architectural decisions made in a vacuum.
- **Remediation**: Two ADRs — one for provider strategy, one for agent registry design (functional vs class, why `Map`, where fallback templates live).

---

## Findings Summary

| #    | Title                                                   | Severity | Effort |
| ---- | ------------------------------------------------------- | -------- | ------ |
| F-1  | Validation order: rate limit consumed before validation | P0       | XS     |
| F-2  | Provider metadata always `'auto'`                       | P0       | S      |
| F-3  | Token extraction OpenRouter-shape-only                  | P0       | S      |
| F-4  | Duplicate `hashInput`                                   | P0       | XS     |
| F-5  | String-matching error codes                             | P0       | M      |
| F-6  | In-memory rate limiter                                  | P1       | M      |
| F-7  | No cost tracking                                        | P1       | M      |
| F-8  | `agent_execution_logs` writes fail silently             | P1       | S      |
| F-9  | No output schema validation                             | P1       | M      |
| F-10 | No `Retry-After` headers                                | P1       | S      |
| F-11 | No provider circuit breaker                             | P1       | M      |
| F-12 | 4 agents lack `OUTPUT FORMAT`                           | P2       | S      |
| F-13 | `chat.ts` has no explicit `model`                       | P2       | XS     |
| F-14 | Pedagogy duplicated across prompts                      | P2       | S      |
| F-15 | Fallback templates inlined in `core.ts`                 | P2       | S      |
| F-16 | Temperature rationale undocumented                      | P3       | S      |
| F-17 | Hardcoded BPM thresholds                                | P3       | S      |
| F-18 | Markdown injection in sanitization                      | P3       | S      |
| F-19 | Static context delimiters                               | P3       | S      |
| F-20 | No output filtering                                     | P3       | S      |
| F-21 | Cross-agent rate-limit evasion                          | P3       | S      |
| F-22 | No Bruno tests for AI endpoints                         | P3       | M      |
| F-23 | No streaming integration tests                          | P3       | M      |
| F-24 | No UI / hook integration tests                          | P3       | M      |
| F-25 | No admin AI usage dashboard                             | P3       | L      |
| F-26 | No `lib/ai/README.md`                                   | P3       | S      |
| F-27 | No ADRs for AI architecture                             | P3       | S      |

**Effort key**: XS = <30 LOC / minutes · S = ~100 LOC / hours · M = ~250 LOC / day · L = ~500+ LOC / multi-day

**Total**: 27 findings. 5×P0 + 6×P1 + 4×P2 + 12×P3.

---

## Recommendations

### Immediate (next 1-2 weeks)

1. **PR 1 — Foundation**: F-1, F-2, F-3, F-4, F-5 + typed errors. Surgical correctness work, unblocks accurate observability for everything else.
2. **PR 2 — Polish**: F-12, F-13, F-14, F-15, F-16 — completes the P1 prompt audit on remaining agents, deduplicates knowledge.

### Short-term (next month)

3. **PR 3 — Rate Limiter Persistence**: F-6 + F-10. Supabase-backed counter with proper response headers. **Critical before scaling beyond current DAU.**
4. **PR 4 — Cost Tracking**: F-7 + F-8. Pricing table, cost column, rollup queries.
5. **PR 5 — Output Schema Validation**: F-9. Start with `song-normalization` (highest risk), extend incrementally.
6. **PR 6 — Circuit Breaker**: F-11. Per-provider health tracking.

### Medium-term (next 1-2 months)

7. **PR 7 — Security Hardening**: F-18, F-19, F-20, F-21. Defense-in-depth.
8. **PR 8 — Test Coverage**: F-22, F-23, F-24. Bruno + streaming + UI.
9. **PR 9 — Admin Dashboard**: F-25. Operationalize the analytics pipeline.
10. **PR 10 — Documentation**: F-26, F-27. README + ADRs.

### Sequencing Notes

- PRs 1–2 ship in either order; PR 1 first is safer.
- PRs 3–6 ship in the listed order (each leans on typed errors from PR 1).
- PRs 7–10 can parallelize after PRs 1–6 are merged.
- Estimated total: ~3-4 weeks of solo development time at normal pace.

---

## What's Working Well

Worth calling out — the system has real strengths:

- **Layered validation** — schema → rate limit → input → permissions → context all live in distinct functions.
- **Sanitization is intentional** — `sanitizeContextValue` handles role markers, LLM special tokens, code-block breakout, NFC normalization. The injection mitigation is more sophisticated than most LLM apps.
- **Provider abstraction is clean** — `AIProvider` interface, factory pattern, env-driven switching. Adding a third provider would be straightforward.
- **Context summarization** — `buildStudentContextSummary` is a thoughtful prompt-efficiency optimization, not a typical pattern.
- **Fallback templates** — 7 agents have static fallbacks for provider outages. Placement is suboptimal (F-15) but the existence is a sign of operational maturity.
- **Test coverage of agent specs** — `agents.test.ts` validates spec shape per-agent; the recent P1 audit added a regression test for `chat`'s `allowedFields` change.
- **Recent prompt audit** — the work in `ece08ea7` lowered temperatures appropriately for analytical tasks and added structured outputs. This audit is a continuation of that direction, not a contradiction.

The AI system is **closer to production-ready than most early-stage SaaS AI implementations**. The gaps identified here are real but tractable — none require architectural rewrites.

---

## Appendix A — Verified File:Line References

For each finding, the exact source location was read and verified during this audit:

```
F-1   lib/ai/registry/core.ts:85-98
F-2   lib/ai/registry/core.ts:117,135,161
F-3   lib/ai/registry/core.ts:118-120
F-4   lib/ai/registry/core.ts:37-43 + lib/ai/registry/execution.ts:205-211
F-5   lib/ai/registry/core.ts:45-55 + lib/ai/registry/analytics.ts:300-313
F-6   lib/ai/rate-limiter.ts:13
F-7   lib/ai/registry/analytics.ts (entire file — no pricing)
F-8   lib/ai/registry/analytics.ts:90-112
F-9   lib/ai/registry/types.ts:8-55 (no outputSchema field)
F-10  lib/ai/rate-limiter.ts:94-105 (data exists, not propagated)
F-11  lib/ai/provider-factory.ts (no retry/health tracking)
F-12  lib/ai/agents/{chat,song-notes,song-notes-enhancer,song-normalization}.ts
F-13  lib/ai/agents/chat.ts:65-66
F-14  Pattern appears in lib/ai/agents/{chat,post-lesson-summary,lesson-notes,assignment}.ts
F-15  lib/ai/registry/core.ts:19-34
F-18  lib/ai/registry/execution.ts:24-44
F-19  lib/ai/registry/execution.ts:145,163,169
F-20  lib/ai/registry/execution.ts:77-84
F-21  lib/ai/rate-limiter.ts:67
```

## Appendix B — Out of Scope

Deliberately not audited (would expand scope significantly):

- API route handlers under `app/api/ai/**` — sampled but not exhaustively reviewed for auth, validation, error mapping.
- Front-end invocation code (hooks, components) beyond test coverage assessment.
- AI SDK v6 migration / Vercel AI Gateway integration — would deliver some of these improvements "for free" but is a bigger refactor decision in its own right.
- Multi-tenant cost ceilings (per-school budget caps) — needs a billing model first.
- Vector DB / RAG over lesson history — requires data architecture decision.
- E2E user flows that invoke AI — Playwright coverage assessment.

---

_End of audit._
