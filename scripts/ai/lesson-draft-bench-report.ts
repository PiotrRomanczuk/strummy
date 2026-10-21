/**
 * Builds <bench dir>/report.html from the runs of lesson-draft-bench.ts:
 * one section per lesson, the recorder summary as the reference, one column
 * per model with status, cost in time/tokens and what it proposed.
 *
 *   npx tsx scripts/ai/lesson-draft-bench-report.ts --dir <bench dir>
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Song = { heardTitle?: string; heardArtist?: string | null; status?: string | null; role?: string; notes?: string[]; songFacts?: { chords?: string[]; strummingPattern?: string | null } };
type Draft = {
  lessonTitle?: string | null;
  songs?: Song[];
  assignment?: { title?: string; checklist?: string[] } | null;
  skills?: { skillName?: string; status?: string }[];
  notes?: Record<string, string[]>;
  questions?: string[];
};
type Run = {
  lesson: string; lessonDate: string; student: string; model: string; promptVersion: string;
  httpStatus: number; latencyMs: number; retries?: number; finishReason: string | null;
  usage: { prompt_tokens?: number; completion_tokens?: number } | null;
  parseOk: boolean; schemaOk: boolean; issues: string[]; draft: Draft | null;
  error: { message?: string; metadata?: { raw?: string } } | null; content: string;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const list = (items: unknown[] | undefined) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="muted">—</p>');

function verdict(r: Run): string {
  if (r.httpStatus !== 200) return `<span class="bad">HTTP ${r.httpStatus}</span> ${esc(r.error?.metadata?.raw ?? r.error?.message).slice(0, 160)}`;
  if (!r.parseOk) return `<span class="bad">nie-JSON</span> (${esc(r.finishReason)})`;
  if (!r.schemaOk) return `<span class="warn">JSON poza schematem</span> ${esc(r.issues.slice(0, 3).join('; '))}`;
  return '<span class="ok">poprawny szkic</span>';
}

function draftHtml(d: Draft | null): string {
  if (!d) return '';
  const songs = (d.songs ?? []).map(
    (s) => `<li><b>${esc(s.heardTitle)}</b>${s.heardArtist ? ` — ${esc(s.heardArtist)}` : ''} <span class="tag">${esc(s.role)} · ${esc(s.status ?? '?')}</span>${s.songFacts?.chords?.length ? `<br><small>akordy: ${esc(s.songFacts.chords.join(' '))}</small>` : ''}${list(s.notes)}</li>`
  );
  return `<h4>${esc(d.lessonTitle ?? '(bez tytułu)')}</h4>
    <h5>Piosenki</h5>${songs.length ? `<ul>${songs.join('')}</ul>` : '<p class="muted">—</p>'}
    <h5>Praca domowa</h5>${d.assignment ? `<p><b>${esc(d.assignment.title)}</b></p>${list(d.assignment.checklist)}` : '<p class="muted">—</p>'}
    <h5>Do poprawy</h5>${list(d.notes?.needsWork)}
    <h5>Technika</h5>${list(d.notes?.technique)}
    <h5>Umiejętności</h5>${list((d.skills ?? []).map((s) => `${s.skillName} (${s.status})`))}
    <h5>Pytania</h5>${list(d.questions)}`;
}

function main() {
  const i = process.argv.indexOf('--dir');
  const dir = i >= 0 ? process.argv[i + 1] : undefined;
  if (!dir) throw new Error('usage: --dir <bench dir>');
  const runs = readdirSync(join(dir, 'runs')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, 'runs', f), 'utf8')) as Run);
  const inputs = new Map(
    readdirSync(join(dir, 'inputs')).map((f) => {
      const input = JSON.parse(readFileSync(join(dir, 'inputs', f), 'utf8')) as { id: string; summary: string | null };
      return [input.id, input.summary ?? ''] as const;
    })
  );

  const lessons = [...new Set(runs.map((r) => r.lesson))].sort((a, b) => {
    const da = runs.find((r) => r.lesson === a)?.lessonDate ?? '';
    const db = runs.find((r) => r.lesson === b)?.lessonDate ?? '';
    return da.localeCompare(db);
  });

  const sections = lessons.map((lesson) => {
    const lr = runs.filter((r) => r.lesson === lesson).sort((a, b) => a.model.localeCompare(b.model));
    const head = lr[0];
    const cols = lr.map(
      (r) => `<div class="col"><h3>${esc(r.model)}</h3><p>${verdict(r)}</p>
        <p class="muted">${(r.latencyMs / 1000).toFixed(0)} s · ${r.usage?.prompt_tokens ?? '?'} → ${r.usage?.completion_tokens ?? '?'} tok · prompt ${esc(r.promptVersion)}${r.retries ? ` · ponowienia ${r.retries}` : ''}</p>
        ${draftHtml(r.schemaOk || r.parseOk ? r.draft : null)}</div>`
    );
    return `<section><h2>${esc(head.lessonDate)} · ${esc(head.student)}</h2>
      <details><summary>Podsumowanie Wispr (punkt odniesienia)</summary><pre>${esc(inputs.get(lesson))}</pre></details>
      <div class="cols">${cols.join('')}</div></section>`;
  });

  const ok = runs.filter((r) => r.schemaOk).length;
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Benchmark szkiców lekcji</title><style>
body{font:14px/1.45 system-ui,sans-serif;margin:16px;color:#1d1d1f;background:#fafaf7}h1{font-size:20px}h2{margin-top:28px}
.cols{display:flex;gap:12px;overflow-x:auto}.col{flex:0 0 340px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px}
.col h3{font-size:13px;margin:0 0 4px}h4{margin:8px 0 2px}h5{margin:8px 0 2px;font-size:12px;text-transform:uppercase;color:#666}
ul{margin:2px 0 2px 18px;padding:0}.muted{color:#888}.ok{color:#137333;font-weight:600}.warn{color:#b06000;font-weight:600}.bad{color:#c5221f;font-weight:600}
.tag{font-size:11px;background:#eee;border-radius:4px;padding:0 4px}pre{white-space:pre-wrap;background:#fff;border:1px solid #ddd;padding:8px}
</style></head><body><h1>Benchmark szkiców lekcji gitary</h1>
<p>${runs.length} wywołań, ${ok} poprawnych szkiców. Wygenerowano ${esc(new Date().toISOString().slice(0, 16))}.</p>${sections.join('')}</body></html>`;
  writeFileSync(join(dir, 'report.html'), html);
  console.log(join(dir, 'report.html'));
}

main();
