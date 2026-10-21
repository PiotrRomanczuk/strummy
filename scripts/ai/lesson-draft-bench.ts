/**
 * Lesson-draft benchmark (CNT-8): runs the production prompt over recorded
 * lessons with several OpenRouter models and keeps every raw answer.
 *
 *   npx tsx scripts/ai/lesson-draft-bench.ts --dir <bench dir> \
 *     --models google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free
 *
 * <bench dir>/inputs/*.json  one lesson each (see BenchInput)
 * <bench dir>/skills-catalog.txt  one skill name per line (optional)
 * <bench dir>/runs/<lesson>__<model>.json  written here, one per call
 *
 * Transcripts are private: keep the bench dir outside the repo. The user
 * message is built with buildLessonDraftUserMessage, so names are stripped
 * exactly as in production before anything leaves the machine.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildLessonDraftUserMessage,
  LESSON_DRAFT_JSON_SHAPE,
  LESSON_DRAFT_SYSTEM_PROMPT,
} from '../../lib/ai/agents/lesson-transcript-draft-prompt';
import { LESSON_DRAFT_SYSTEM_PROMPT_V2 } from '../../lib/ai/agents/lesson-transcript-draft-prompt-v2';
import { lessonTranscriptDraftSchema } from '../../lib/ai/schemas/lesson-transcript-draft';

import { callModel, printQuota } from './lesson-draft-bench-providers';

type BenchInput = {
  id: string;
  lessonDate: string;
  studentLabel: string;
  studentNames: string[];
  teacherNames: string[];
  summary: string | null;
  transcript: string;
};

const PROMPTS: Record<string, string> = { 'v1-prod': LESSON_DRAFT_SYSTEM_PROMPT, v2: LESSON_DRAFT_SYSTEM_PROMPT_V2 };
const PROMPT_VERSION = process.env.PROMPT_VERSION || 'v1-prod';

/** Built-in prompts, or <bench dir>/prompts/<version>.md for prompt iterations. */
function systemPrompt(dir: string): string {
  const file = join(dir, 'prompts', `${PROMPT_VERSION}.md`);
  const base = existsSync(file) ? readFileSync(file, 'utf8') : PROMPTS[PROMPT_VERSION];
  if (!base) throw new Error(`unknown PROMPT_VERSION ${PROMPT_VERSION}`);
  return `${base}\n\nRespond ONLY with one JSON object of exactly this shape, no markdown fences:\n${LESSON_DRAFT_JSON_SHAPE}`;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?|```$/gm, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

function evaluate(content: string) {
  try {
    const json = extractJson(content);
    const parsed = lessonTranscriptDraftSchema.safeParse(json);
    return parsed.success
      ? { parseOk: true, schemaOk: true, issues: [], draft: parsed.data }
      : { parseOk: true, schemaOk: false, issues: parsed.error.issues.slice(0, 15).map((i) => `${i.path.join('.')}: ${i.message}`), draft: json };
  } catch (e) {
    return { parseOk: false, schemaOk: false, issues: [String(e)], draft: null };
  }
}

async function main() {
  const dir = arg('dir');
  const models = (arg('models') ?? '').split(',').filter(Boolean);
  if (!dir || models.length === 0) throw new Error('usage: --dir <bench dir> --models a,b');
  if (models.some((m) => !m.startsWith('ollama/')) && !process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');

  const catalogFile = join(dir, 'skills-catalog.txt');
  const skillCatalog = existsSync(catalogFile) ? readFileSync(catalogFile, 'utf8').split('\n').filter(Boolean) : [];
  const runsDir = join(dir, 'runs');
  mkdirSync(runsDir, { recursive: true });
  const SYSTEM = systemPrompt(dir);
  writeFileSync(join(dir, `system-prompt-${PROMPT_VERSION}.txt`), SYSTEM);

  await printQuota(models);
  const only = arg('only');
  const inputs = readdirSync(join(dir, 'inputs')).filter((f) => f.endsWith('.json') && (!only || f.includes(only)));
  for (const file of inputs) {
    const input = JSON.parse(readFileSync(join(dir, 'inputs', file), 'utf8')) as BenchInput;
    const user = buildLessonDraftUserMessage({ ...input, knownSongs: [], skillCatalog });
    for (const model of models) {
      const out = join(runsDir, `${file.replace('.json', '')}__${slug(model)}__${PROMPT_VERSION}.json`);
      const previous = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')) as { schemaOk?: boolean }) : null;
      if (previous?.schemaOk && !process.argv.includes('--force')) {
        console.log(`skip ${out}`);
        continue;
      }
      const call = await callModel(model, SYSTEM, user);
      const result = evaluate(call.content);
      writeFileSync(
        out,
        JSON.stringify(
          { lesson: input.id, lessonDate: input.lessonDate, student: input.studentLabel, model, promptVersion: PROMPT_VERSION,
            systemPromptHash: sha(SYSTEM), userMessageHash: sha(user), userMessageChars: user.length,
            ranAt: new Date().toISOString(), ...call, ...result },
          null,
          1
        )
      );
      console.log(`${input.lessonDate} ${input.id} ${model}: http ${call.httpStatus} ${call.latencyMs}ms parse=${result.parseOk} schema=${result.schemaOk}`);
      await new Promise((r) => setTimeout(r, model.startsWith('ollama/') ? 0 : 4000));
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
