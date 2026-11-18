import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The gallery is what the owner reads before accepting test → main, and its
 * summary is what the review page shows inline. A screen sorted into "bez
 * zmian" by mistake is a change nobody looks at, so the grouping is pinned
 * here. The script is a standalone .mjs with top-level side effects, so it is
 * driven the way run-review.sh drives it: a fixture review-out in, files out.
 */

const SCRIPT = join(process.cwd(), 'scripts/review/build-gallery.mjs');

type Status = 'same' | 'changed' | 'error';
type Side = { http?: number; url?: string; errors?: string[] };

function entry(
  project: string,
  persona: string,
  step: number,
  title: string,
  status: Status,
  test: Side = {}
) {
  const base = `shots/${project}/${persona}-${step}`;
  return {
    project,
    persona,
    personaLabel: persona === 'uczen' ? 'Uczeń' : 'Nauczyciel',
    step,
    key: title.toLowerCase(),
    title,
    path: `/dashboard/${step}`,
    status,
    main: { file: `${base}-main.png`, http: 200, url: `/dashboard/${step}`, errors: [] },
    test: {
      file: `${base}-test.png`,
      http: test.http ?? 200,
      url: test.url ?? `/dashboard/${step}`,
      errors: test.errors ?? [],
    },
    diff: status === 'changed' ? `${base}-diff.png` : null,
  };
}

function build(entries: object[]) {
  const dir = mkdtempSync(join(tmpdir(), 'review-gallery-'));
  writeFileSync(join(dir, 'manifest.jsonl'), entries.map((e) => JSON.stringify(e)).join('\n'));
  writeFileSync(
    join(dir, 'cast.json'),
    JSON.stringify({ mode: 'roles', cast: [{ key: 'nauczyciel' }, { key: 'uczen' }] })
  );
  writeFileSync(
    join(dir, 'meta.json'),
    JSON.stringify({
      test_sha: 'a'.repeat(40),
      main_sha: 'b'.repeat(40),
      gallery_url: 'http://g/x',
    })
  );
  execFileSync('node', [SCRIPT, dir]);
  const read = (f: string) => readFileSync(join(dir, f), 'utf8');
  const result = { html: read('index.html'), summary: read('summary.md') };
  rmSync(dir, { recursive: true, force: true });
  return result;
}

describe('review gallery', () => {
  it('counts a screen once, by its worst device', () => {
    const { summary } = build([
      entry('desktop', 'uczen', 1, 'Pulpit', 'same'),
      entry('telefon', 'uczen', 1, 'Pulpit', 'changed'),
      entry('desktop', 'nauczyciel', 1, 'Lekcje', 'same'),
      entry('telefon', 'nauczyciel', 1, 'Lekcje', 'same'),
    ]);
    expect(summary).toContain('**Zmienione: 1 · z błędem: 0 · bez zmian: 1**');
    expect(summary).toContain('- Uczeń · Pulpit (telefon)');
    expect(summary).toContain('`test` aaaaaaa wobec `main` bbbbbbb');
    expect(summary).toContain('[Otwórz galerię](http://g/x)');
  });

  it('puts broken screens first and says why', () => {
    const { summary, html } = build([
      entry('desktop', 'nauczyciel', 2, 'Kalendarz', 'changed'),
      entry('desktop', 'uczen', 1, 'Zadanie', 'error', { http: 500 }),
      entry('desktop', 'uczen', 2, 'Lekcja', 'error', { url: '/sign-in' }),
      entry('desktop', 'uczen', 3, 'Repertuar', 'error', { errors: ['TypeError: x is undefined'] }),
    ]);
    expect(summary.indexOf('Z błędem na')).toBeLessThan(summary.indexOf('\nZmienione:'));
    expect(summary).toContain('Uczeń · Zadanie (desktop): HTTP 500');
    expect(summary).toContain('Uczeń · Lekcja (desktop): wylogowało do /sign-in');
    expect(summary).toContain('Uczeń · Repertuar (desktop): błąd JS: TypeError: x is undefined');
    expect(html.indexOf('Z błędem na test (3)')).toBeLessThan(html.indexOf('Zmienione (1)'));
  });

  it('orders screens by persona, then by step', () => {
    const { html } = build([
      entry('desktop', 'uczen', 1, 'Pulpit ucznia', 'changed'),
      entry('desktop', 'nauczyciel', 2, 'Drugi', 'changed'),
      entry('desktop', 'nauczyciel', 1, 'Pierwszy', 'changed'),
    ]);
    const at = (t: string) => html.indexOf(t);
    expect(at('Pierwszy')).toBeLessThan(at('Drugi'));
    expect(at('Drugi')).toBeLessThan(at('Pulpit ucznia'));
  });

  it('escapes what the pages put into the gallery', () => {
    const { html } = build([
      entry('desktop', 'uczen', 1, 'Pulpit', 'error', { errors: ['<img src=x onerror=alert(1)>'] }),
    ]);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('refuses a run that captured nothing', () => {
    expect(() => build([])).toThrow();
  });
});
