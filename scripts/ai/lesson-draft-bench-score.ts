/**
 * Scores lesson-draft-bench runs against <bench dir>/gold.json (hand-labelled
 * expected songs, roles, statuses, homework, unnamed songs). 0–100 per run,
 * plus the list of concrete errors that the next prompt version should fix.
 *
 *   npx tsx scripts/ai/lesson-draft-bench-score.ts --dir <bench dir> [--prompt v3]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type GoldSong = { match: string[]; roles: string[]; statuses: (string | null)[] };
type Gold = {
  label: string;
  songs: { required: GoldSong[]; allowedExtra: string[][] };
  homework: 'explicit' | 'none';
  homeworkKeywords?: string[];
  unnamed?: { keywords: string[]; questionKeywords: string[] };
};
type Song = { heardTitle?: string; heardArtist?: string | null; role?: string; status?: string | null; notes?: string[] };
type Draft = { songs?: Song[]; assignment?: { title?: string; description?: string; isExplicit?: boolean } | null; questions?: string[]; notes?: Record<string, string[]> };
type Run = { lesson: string; model: string; promptVersion: string; schemaOk: boolean; draft: Draft | null; latencyMs: number };

const low = (s: unknown) => String(s ?? '').toLowerCase();
const has = (text: string, keys: string[]) => keys.some((k) => text.includes(k));
const CONCRETE = /\d|strun|próg|prog|palc|palec|bicie|tłum|dół|góra|kostk|kciuk|power|barr|capo|tempo|uderze|akord/;
const LEAK_TITLES = ["don't panic", 'dont panic', 'wonderwall', 'przykładowa', 'przykladowa'];

function scoreRun(run: Run, gold: Gold) {
  const errors: string[] = [];
  if (!run.schemaOk || !run.draft) return { score: 0, errors: ['niepoprawny JSON / schemat'] };
  const songs = run.draft.songs ?? [];
  let earned = 0;
  let possible = 0;

  // Required songs: found 50%, role 25%, status 25% of 40 points.
  const per = 40 / gold.songs.required.length;
  possible += 40;
  const used = new Set<Song>();
  for (const g of gold.songs.required) {
    const s = songs.find((x) => has(low(x.heardTitle), g.match));
    if (!s) { errors.push(`brak piosenki: ${g.match[0]}`); continue; }
    used.add(s);
    earned += per * 0.5;
    if (g.roles.includes(low(s.role))) earned += per * 0.25;
    else errors.push(`${g.match[0]}: rola ${s.role}, oczekiwano ${g.roles.join('/')}`);
    if (g.statuses.includes(s.status ?? null)) earned += per * 0.25;
    else errors.push(`${g.match[0]}: status ${s.status}, oczekiwano ${g.statuses.join('/')}`);
  }

  // Invented or leaked songs: 10 points, -5 each.
  possible += 10;
  let hallu = 0;
  for (const s of songs) {
    if (used.has(s)) continue;
    const t = `${low(s.heardTitle)} ${low(s.heardArtist)}`;
    if (has(t, LEAK_TITLES)) { hallu += 3; errors.push(`skopiowany przykład z promptu: ${s.heardTitle}`); continue; }
    if (gold.songs.allowedExtra.some((keys) => has(t, keys))) continue;
    if (gold.unnamed && has(t, gold.unnamed.keywords)) {
      // Generic = nothing left once descriptive words are removed (no guessed title).
      const rest = low(s.heardTitle).replace(/riff|nieznan\w*|utw[oó]r\w*|queen\w*|bez|tytu\w*|nie|pad\w*|z|[^a-ząćęłńóśźż]/g, '');
      const generic = rest.length < 3;
      if (!generic) { hallu += 1; errors.push(`wymyślony tytuł dla nienazwanej piosenki: ${s.heardTitle}`); }
      continue;
    }
    hallu += 1;
    errors.push(`piosenka spoza lekcji: ${s.heardTitle}`);
  }
  earned += Math.max(0, 10 - 5 * hallu);

  // Homework: 25 points.
  possible += 25;
  const a = run.draft.assignment;
  if (gold.homework === 'none') {
    if (!a) earned += 25;
    else if (a.isExplicit === false) { earned += 12; errors.push(`praca domowa wywnioskowana, a nie było jej: ${a.title}`); }
    else errors.push(`ZMYŚLONA praca domowa „wprost”: ${a.title}`);
  } else if (!a) errors.push('brak pracy domowej, a była zadana');
  else {
    earned += a.isExplicit ? 15 : 8;
    if (!a.isExplicit) errors.push('praca domowa zadana wprost, a isExplicit=false');
    if (has(low(`${a.title} ${a.description}`), gold.homeworkKeywords ?? [])) earned += 10;
    else errors.push(`praca domowa o czym innym: ${a.title}`);
  }

  // Unnamed song must become a question: 10 points.
  if (gold.unnamed) {
    possible += 10;
    const q = (run.draft.questions ?? []).map(low).join(' | ');
    if (has(q, gold.unnamed.questionKeywords)) earned += 10;
    else errors.push('brak pytania o nienazwaną piosenkę');
  }

  // Concrete notes: 15 points by share of notes with strings/frets/fingers/strumming.
  possible += 15;
  const notes = [...songs.flatMap((s) => s.notes ?? []), ...(run.draft.notes?.needsWork ?? []), ...(run.draft.notes?.technique ?? [])];
  const concrete = notes.length ? notes.filter((n) => CONCRETE.test(low(n))).length / notes.length : 0;
  earned += 15 * concrete;
  if (concrete < 0.6) errors.push(`mało konkretne notatki (${Math.round(concrete * 100)}%)`);

  return { score: Math.round((earned / possible) * 100), errors };
}

function main() {
  const i = process.argv.indexOf('--dir');
  const dir = i >= 0 ? process.argv[i + 1] : undefined;
  if (!dir) throw new Error('usage: --dir <bench dir> [--prompt vN]');
  const j = process.argv.indexOf('--prompt');
  const only = j >= 0 ? process.argv[j + 1] : undefined;
  const gold = JSON.parse(readFileSync(join(dir, 'gold.json'), 'utf8')) as Record<string, Gold>;
  const runs = readdirSync(join(dir, 'runs'))
    .map((f) => JSON.parse(readFileSync(join(dir, 'runs', f), 'utf8')) as Run)
    .filter((r) => gold[r.lesson] && (!only || r.promptVersion === only));

  const groups = new Map<string, { run: Run; score: number; errors: string[] }[]>();
  for (const run of runs) {
    const key = `${run.promptVersion} · ${run.model}`;
    groups.set(key, [...(groups.get(key) ?? []), { run, ...scoreRun(run, gold[run.lesson]) }]);
  }
  const summary = [...groups.entries()].sort().map(([key, rs]) => ({
    key,
    avg: Math.round(rs.reduce((n, r) => n + r.score, 0) / rs.length),
    runs: rs.length,
    lessons: rs.map((r) => ({ lesson: gold[r.run.lesson].label, score: r.score, errors: r.errors })),
  }));
  for (const s of summary) {
    console.log(`${s.avg.toString().padStart(3)}  ${s.key} (${s.runs})`);
    for (const l of s.lessons) console.log(`      ${l.score.toString().padStart(3)} ${l.lesson}: ${l.errors.join('; ') || 'ok'}`);
  }
  writeFileSync(join(dir, `scores${only ? `-${only}` : ''}.json`), JSON.stringify(summary, null, 1));
}

main();
