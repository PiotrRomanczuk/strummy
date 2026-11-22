// The gallery's HTML (build-gallery.mjs). Self-contained apart from the
// screenshots, which sit next to index.html in shots/.
import { problem } from './manifest-gaps.mjs';
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const short = (sha) => (sha ? esc(String(sha).slice(0, 7)) : '?');
const BADGE = { same: 'bez zmian', changed: 'zmieniony', error: 'błąd na test' };

const CSS = `
:root{--bg:#fafafa;--card:#fff;--ink:#1d1d1f;--ink-2:#6e6e73;--line:#d2d2d7;--red:#c9184a;--amber:#b25e09;--code:#f0f0f3}
@media (prefers-color-scheme:dark){:root{--bg:#111113;--card:#1c1c1f;--ink:#f2f2f4;--ink-2:#a1a1a8;--line:#38383d;--red:#ff5c80;--amber:#ffb454;--code:#2a2a2e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:36px 0 12px}
h3{font-size:16px;margin:0 0 8px}h4{font-size:13px;margin:12px 0 6px;color:var(--ink-2);font-weight:600}
code{font:13px ui-monospace,Menlo,monospace;background:var(--code);padding:1px 5px;border-radius:5px;word-break:break-all}
.meta,.how{color:var(--ink-2);margin:4px 0}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.chip,.badge{border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:13px}
.chip.error,.badge.error{border-color:var(--red);color:var(--red)}.chip.changed,.badge.changed{border-color:var(--amber);color:var(--amber)}
.screen{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}
.trio{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;align-items:start}
figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:8px;background:var(--bg)}
.trio img{max-height:900px;object-fit:cover;object-position:top}figcaption{font-size:12px;color:var(--ink-2);margin-top:4px}
.err{color:var(--red);font-size:13px;margin:6px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:12px;margin-top:12px}
.grid img{aspect-ratio:16/11;object-fit:cover;object-position:top}
details>summary{cursor:pointer;color:var(--ink-2)}`;

function figure(file, caption) {
  return `<figure><a href="${esc(file)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(file)}" alt="${esc(caption)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
}

function side(label, s) {
  const where = s.url && s.url !== s.path ? ` · skończyło na ${s.url}` : '';
  return `${label} · HTTP ${s.http ?? '—'}${where}`;
}

function device(shot) {
  // No screenshots exist for a step that threw or never ran: say so instead.
  if (shot.captureError) {
    return `<h4>${esc(shot.project)} <span class="badge ${shot.status}">${BADGE[shot.status]}</span></h4>
<p class="err">${esc(problem(shot))}</p>`;
  }
  const errors = [
    ...shot.test.errors.map((e) => `test: ${e}`),
    ...shot.main.errors.map((e) => `main: ${e}`),
  ];
  return `<h4>${esc(shot.project)} <span class="badge ${shot.status}">${BADGE[shot.status]}</span></h4>
<div class="trio">${figure(shot.main.file, side('main', { ...shot.main, path: shot.path }))}${figure(shot.test.file, side('test', { ...shot.test, path: shot.path }))}${shot.diff ? figure(shot.diff, 'różnica (czerwone = inne piksele)') : ''}</div>
${errors.map((e) => `<p class="err">błąd JS — ${esc(e)}</p>`).join('')}`;
}

function screen(g) {
  return `<article class="screen" id="${esc(`${g.persona}-${g.step}`)}"><h3>${esc(g.personaLabel)} · ${esc(g.title)} <code>${esc(g.path)}</code></h3>${g.shots.map(device).join('')}</article>`;
}

function thumbs(groups) {
  return `<div class="grid">${groups
    .map((g) => figure(g.shots[0].test.file, `${g.personaLabel} · ${g.title}`))
    .join('')}</div>`;
}

export function renderPage({ meta, mode, groups, counts }) {
  const pick = (s) => groups.filter((g) => g.status === s);
  const who =
    mode === 'copy'
      ? 'osoby z zanonimizowanej kopii produkcji (StrummyTest)'
      : 'konta ról z bazy dev';
  const when = esc(meta.created_at ?? new Date().toISOString())
    .replace('T', ' ')
    .slice(0, 16);
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ekrany test i main</title><style>${CSS}</style></head><body><main>
<h1>Ekrany: <code>test</code> ${short(meta.test_sha)} wobec <code>main</code> ${short(meta.main_sha)}</h1>
<p class="meta">${when} · ${who} · desktop 1440 px i telefon 390 px, po polsku</p>
<p class="chips"><span class="chip error">z błędem: ${counts.error}</span><span class="chip changed">zmienione: ${counts.changed}</span><span class="chip">bez zmian: ${counts.same}</span></p>
<p class="how">Każdy ekran otwarty w tej samej chwili na obu wersjach, jako ta sama osoba, na tych samych danych. Kliknij obraz, żeby zobaczyć go w pełnym rozmiarze.</p>
${counts.error ? `<h2>Z błędem na test (${counts.error})</h2>${pick('error').map(screen).join('')}` : ''}
${counts.changed ? `<h2>Zmienione (${counts.changed})</h2>${pick('changed').map(screen).join('')}` : ''}
<h2>Bez zmian (${counts.same})</h2><details><summary>Pokaż ekrany bez zmian</summary>${thumbs(pick('same'))}</details>
</main></body></html>
`;
}
