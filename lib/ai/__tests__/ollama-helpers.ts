/**
 * Shared helpers for Ollama integration tests.
 * Import into each ollama.*.integration.test.ts file.
 */

import { createProviderFactory } from '../provider-factory';
import { registerAllAgents } from '../agents/index';
import type { AgentResponse } from '../registry';

export const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://192.168.1.10:11435';
export const OLLAMA_MODEL = 'gemma3:12b';
export const ctx = { userId: 'ollama-test', userRole: 'admin' as const };

export function extractContent(response: AgentResponse): string {
  return (response.result as { content?: string } | null)?.content ?? '';
}

export async function setupOllamaEnv(): Promise<boolean> {
  // Restore real fetch — jest.setup.js replaces global.fetch with a mock.
  // Use undici directly: it tolerates the proxy's duplicate Content-Length headers
  // that Node's built-in http module rejects.
  const { fetch: realFetch } = await import('undici');
  global.fetch = realFetch as unknown as typeof globalThis.fetch;

  process.env.OLLAMA_BASE_URL = OLLAMA_URL;
  process.env.AI_PROVIDER = 'ollama';
  createProviderFactory().clearCache();

  let available = false;
  try {
    const res = await (realFetch as typeof globalThis.fetch)(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const { models } = (await res.json()) as { models: { name: string }[] };
      available = true;
      console.log(`✓ Ollama @ ${OLLAMA_URL} — ${models.map((m) => m.name).join(', ')}`);
    }
  } catch {
    available = false;
  }

  if (!available) console.warn(`⚠️  Ollama not reachable at ${OLLAMA_URL} — tests will skip`);
  registerAllAgents();
  return available;
}
