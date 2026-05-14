# ADR-003: AI Agent Registry Design

**Date**: 2026-05-14
**Status**: Accepted
**Deciders**: Piotr Romanczuk

## Context

Strummy needs to host multiple distinct AI agents (9 at time of writing) that share infrastructure — providers, rate limiting, logging, prompt sanitization — but differ in their system prompts, allowed users, input constraints, and UI placement. The implementation needed to answer three design questions:

1. **How are agents stored and looked up at runtime?**
2. **How do agents degrade gracefully when the AI provider is unavailable?**
3. **How can new agents be added without modifying core infrastructure?**

## Decision

### Map-based functional registry

Agents are stored in a module-level `Map<string, AgentSpecification>` inside `registry/core.ts`. Registration and lookup are plain functions (`registerAgent`, `getAgent`, `executeAgentRequest`, etc.) rather than class methods.

This was chosen over alternatives for the following reasons:

- **Class-based singleton**: `Map` + exported functions achieves the same single-instance behaviour (one module = one `Map` in Node's module cache) without the boilerplate of a class, a private constructor, and a `getInstance()` call. The legacy `agentRegistry` object at the bottom of `core.ts` is a thin compatibility shim retained for any callers that predate the functional refactor.
- **Database-backed registry**: Storing agent specs in Supabase was considered but rejected. Agent specs are code artefacts — they contain system prompts, temperature values, and TypeScript types. Keeping them in source provides type safety, diffable history, and zero cold-start latency. The database is used only for execution logs and rate-limit counters, not for spec storage.
- **Dynamic `require`/plugin pattern**: Too complex for the current scale. All agents are known at build time.

`Map` lookups are O(1) by `agentId` string key. `getAllAgents()` iterates `Map.values()` for the rare cases (admin UI, stats) where the full list is needed.

### Execution order and guard-clause sequencing

`executeAgentRequest` runs guards in a deliberate order chosen to protect both security and quota:

1. Agent lookup — fail fast if the ID is unknown.
2. Input validation — reject bad input before any quota is consumed.
3. Permission check — reject unauthorised roles before any quota is consumed.
4. Rate-limit check — only valid, permitted requests count against the window.
5. Context preparation — fetch required and optional Supabase data.
6. Provider execution — call the AI provider.
7. Output sanitization — strip role markers and special tokens from the response.
8. Logging — write to `agent_execution_logs` and the in-memory buffer.

This ordering means a burst of malformed or unauthorised requests does not deplete the rate-limit quota of legitimate users.

### Fallback templates

When provider execution fails (any exception in step 6), the registry attaches a pre-written Markdown template to the response as `{ content, isFallback: true }`. This lets the UI render something useful rather than a blank error state.

Fallback content is resolved in two tiers:

1. `AgentSpecification.fallbackTemplate` — defined per-agent in the spec file. Takes precedence.
2. `AGENT_FALLBACK_TEMPLATES` map in `registry/core.ts` — a centralised map keyed by `agentId` for agents that did not define their own template, or for overrides managed centrally.

Most agents with structured output (lesson notes, assignments, summaries) use the registry map so the template format can be updated in one place. The `chat-assistant` agent defines its own `fallbackTemplate` because its output is plain prose rather than a structured Markdown template.

### Extensibility

Adding a new agent requires three steps with no changes to core infrastructure:

1. Create `lib/ai/agents/<name>.ts` exporting an `AgentSpecification` constant.
2. Import it in `lib/ai/agents/index.ts` and call `registerAgent(spec)` inside `registerAllAgents()`.
3. Optionally add a fallback template entry to `AGENT_FALLBACK_TEMPLATES` if not defined in the spec.

The `validateSpecification` function in `registry/validation.ts` enforces required fields and constraints (non-empty `targetUsers`, temperature in 0–2, at least one `allowedField`) at registration time, so misconfigured specs fail loudly during startup rather than at first request.

### AgentSpecification as the single source of truth

The spec interface (`registry/types.ts`) combines concerns that might otherwise be spread across multiple systems:

- **Runtime behaviour**: `systemPrompt`, `temperature`, `maxTokens`, `model`
- **Access control**: `targetUsers`, `dataAccess`
- **Input safety**: `inputValidation`
- **UI integration**: `uiConfig` (category, icon, placement, loading/error messages)
- **Observability**: `enableLogging`, `enableAnalytics`, `successMetrics`

Colocating these in one typed interface means adding a new agent automatically covers all subsystems. There is no separate admin config, no database row to seed, and no UI registration step.

## Consequences

**Positive**

- Zero-latency agent lookup (in-memory `Map`, no I/O).
- Type-safe agent specs; TypeScript catches missing fields at compile time.
- New agents can be added by one developer in one file without touching infrastructure.
- Fallback templates ensure all agents degrade gracefully without custom error-handling code per agent.
- Guard-clause ordering protects rate-limit quota from invalid or unauthorised requests.
- The legacy `agentRegistry` object provides backward compatibility for older call sites without duplicating logic.

**Negative / trade-offs**

- All agent specs are loaded into memory at startup regardless of whether they are used in the current request. For 9 agents this is negligible; at 100+ agents it would warrant lazy loading.
- The `Map` is process-scoped. In a multi-process deployment (multiple Vercel instances) each instance has its own registry. Because all specs are registered from the same source code this is not a correctness issue, but it means `getRegistryStats()` reflects only the local process.
- `outputSchema` (Zod validation of provider output) is declared in the interface but not yet enforced by the runtime. Structured-output agents currently rely on prompt engineering rather than schema validation.
- The `AGENT_FALLBACK_TEMPLATES` map in `core.ts` duplicates agent IDs that also appear in `agents/index.ts`. An agent renamed without updating both locations will silently lose its fallback.

**Future considerations**

- When `outputSchema` is enforced, the execution engine should run Zod `.safeParse` on the provider result and either return a `ValidationError` or fall back to the template.
- If the agent count grows significantly, lazy registration (register on first request) or code-splitting by category could reduce cold-start memory pressure.
- `successMetrics` strings are currently advisory. Wiring them to a metrics backend (Vercel Analytics, PostHog) would make the field functional.
