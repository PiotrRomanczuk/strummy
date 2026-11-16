/**
 * The two ways a home machine asks a model for song suggestions (SNG-15):
 *
 * - local: the Ollama host (OLLAMA_BASE_URL, model OLLAMA_DEFAULT_MODEL or qwen3.5:9b), free;
 * - claude: Claude Code in headless mode (`claude -p`) on the signed-in subscription. It is started with no tools,
 *   no MCP servers, no settings and no slash commands, from the temp directory, so a call carries only the prompt
 *   (about 600 tokens instead of the 500k+ of a full session).
 */

import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

import { FALLBACK_MODELS } from '@/lib/ai/model-mappings';
import { createOllamaProvider } from '@/lib/ai/providers/ollama';
import type { AIMessage } from '@/lib/ai/types';
import type { Ask } from '@/lib/song-suggestions/generate';

export type ModelKind = 'local' | 'claude';

const CLAUDE_TIMEOUT_MS = 180_000;

function localModel(): { ask: Ask; source: string } {
  const model = process.env.OLLAMA_DEFAULT_MODEL ?? FALLBACK_MODELS.ollama;
  // Passed explicitly: the provider's default is read at import, before .env.local is loaded.
  const provider = createOllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  });
  return {
    source: `local:${model}`,
    ask: async (messages) => {
      const result = await provider.complete({ model, messages, temperature: 0, maxTokens: 2000 });
      return 'error' in result ? { error: result.error } : { content: result.content };
    },
  };
}

/** Runs `claude -p`, the system message as its system prompt and the rest on stdin; resolves with `result`. */
function runClaude(
  model: string,
  messages: AIMessage[]
): Promise<{ content: string } | { error: string }> {
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const prompt = messages
    .filter((m) => m.role !== 'system')
    .map((m) => m.content)
    .join('\n\n');
  const args = [
    '-p',
    '--output-format',
    'json',
    '--model',
    model,
    '--tools',
    '',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--setting-sources',
    '',
    '--disable-slash-commands',
    '--system-prompt',
    system,
  ];
  return new Promise((resolve) => {
    const child = spawn('claude', args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), CLAUDE_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('error', (error) => resolve({ error: `claude not runnable: ${error.message}` }));
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(out) as { result?: string; is_error?: boolean };
        if (code === 0 && !parsed.is_error && typeof parsed.result === 'string') {
          resolve({ content: parsed.result });
          return;
        }
      } catch {
        // fall through to the error below
      }
      resolve({ error: `claude exited ${code}: ${err.slice(0, 300) || out.slice(0, 300)}` });
    });
    child.stdin.end(prompt);
  });
}

function claudeModel(): { ask: Ask; source: string } {
  const model = process.env.SONG_SUGGESTIONS_CLAUDE_MODEL ?? 'haiku';
  return { source: `claude:${model}`, ask: (messages) => runClaude(model, messages) };
}

export const modelFor = (kind: ModelKind) => (kind === 'local' ? localModel() : claudeModel());
