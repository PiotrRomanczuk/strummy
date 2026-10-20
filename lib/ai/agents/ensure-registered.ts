import { hasAgent } from '../registry';

import { registerAllAgents } from './index';

/**
 * Makes sure `agentId` is in the registry before `executeAgent` runs.
 *
 * Registration normally happens as a side effect of importing `@/lib/ai`.
 * The transcript-draft, chord-extraction and song-normalization agents only
 * import the registry, so in a serverless bundle (one route = one module
 * graph) nothing ever registered them and `executeAgent` failed with
 * "Agent not found" on production (2026-10-20). The dev server hid it because
 * another route had already imported `@/lib/ai` in the same process.
 */
export function ensureAgentRegistered(agentId: string): void {
  if (hasAgent(agentId)) return;
  registerAllAgents();
}
