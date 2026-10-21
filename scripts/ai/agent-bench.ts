/**
 * Generic agent benchmark: one system prompt version, many test cases, many
 * models, every raw answer kept. Companion of lesson-draft-bench.ts for the
 * other agents (plan: vault analysis/2026-10-21-strummy-ai-agents-test-plan.md).
 *
 *   PROMPT_VERSION=v1 npx tsx scripts/ai/agent-bench.ts --dir <agent dir> \
 *     --models ollama/gemma4:12b,nvidia/nemotron-3.5-super-vl:free [--json] [--only <case id>] [--force]
 *
 * --json asks the providers for a JSON object (structured agents); without it the answer is free text.
 *
 * <agent dir>/prompts/<version>.md   system prompt
 * <agent dir>/cases/*.json           { "id": "...", "user": "<user message as the agent gets it>" }
 * <agent dir>/runs/<case>__<model>__<version>.json   written here (answer text + parsed JSON if any)
 *
 * Cases may hold private lesson data: keep the agent dir outside the repo.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { callModel, printQuota } from './lesson-draft-bench-providers';

type Case = { id: string; user: string };

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/** JSON in an answer, if the agent returns JSON; null for plain-text agents. */
function tryJson(raw: string): unknown {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^```(?:json)?|```$/gm, '').trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function main() {
  const dir = arg('dir');
  const models = (arg('models') ?? '').split(',').filter(Boolean);
  const version = process.env.PROMPT_VERSION || 'v1';
  if (!dir || models.length === 0) throw new Error('usage: --dir <agent dir> --models a,b');
  const promptFile = join(dir, 'prompts', `${version}.md`);
  if (!existsSync(promptFile)) throw new Error(`missing ${promptFile}`);
  const system = readFileSync(promptFile, 'utf8');
  mkdirSync(join(dir, 'runs'), { recursive: true });
  await printQuota(models);

  const only = arg('only');
  const cases = readdirSync(join(dir, 'cases'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, 'cases', f), 'utf8')) as Case)
    .filter((c) => !only || c.id.includes(only));

  for (const model of models) {
    for (const testCase of cases) {
      const out = join(dir, 'runs', `${testCase.id}__${slug(model)}__${version}.json`);
      const previous = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')) as { content?: string }) : null;
      if (previous?.content && !process.argv.includes('--force')) continue;
      const call = await callModel(model, system, testCase.user, process.argv.includes('--json'));
      const text = call.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      writeFileSync(
        out,
        JSON.stringify({ case: testCase.id, model, promptVersion: version, ranAt: new Date().toISOString(), ...call, text, json: tryJson(text) }, null, 1)
      );
      console.log(`${testCase.id} ${model}: http ${call.httpStatus} ${call.latencyMs}ms ${text.length} chars`);
      if (!model.startsWith('ollama/')) await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
