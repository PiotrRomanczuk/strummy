/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseCsvLine } from './csv';
import type { HubSource } from './private-data.types';
import { foldText, readSourcePage } from './source-rows';

let dir: string;

function source(format: HubSource['format'], name: string, content: string, rows: number): HubSource {
  const path = join(dir, name);
  writeFileSync(path, content);
  return {
    id: name,
    label: name,
    description: '',
    path,
    format,
    group: 'dataset',
    license: 'test',
    rows,
    bytes: content.length,
    modified: '2026-11-13T21:00',
  };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-rows-'));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('readSourcePage', () => {
  const lines = Array.from({ length: 7 }, (_, i) => JSON.stringify({ n: i, title: `Song ${i}` }));

  it('pages a JSONL source without reading past the page', async () => {
    const jsonl = source('jsonl', 'songs.jsonl', `${lines.join('\n')}\n`, 7);
    const page = await readSourcePage(jsonl, { page: 2, pageSize: 3 });
    expect(page.rows.map((r) => r.n)).toEqual([3, 4, 5]);
    expect(page.rowNumbers).toEqual([3, 4, 5]);
    expect(page.total).toBe(7);
    expect(page.columns).toEqual(['n', 'title']);
  });

  it('counts every match when filtering, ignoring case and Polish diacritics', async () => {
    const jsonl = source(
      'jsonl',
      'pl.jsonl',
      ['{"title":"Żółta kartka"}', '{"title":"Inna"}', '{"title":"ZOLTA rzeka"}'].join('\n'),
      3
    );
    const page = await readSourcePage(jsonl, { q: 'zolta' });
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.title)).toEqual(['Żółta kartka', 'ZOLTA rzeka']);
  });

  it('reads CSV with quoted commas into named columns', async () => {
    const csv = source(
      'csv',
      'chart.csv',
      'title,performer\n"Hello, Goodbye",The Beatles\nYesterday,The Beatles\n',
      2
    );
    const page = await readSourcePage(csv, { q: 'hello' });
    expect(page.rows).toEqual([{ title: 'Hello, Goodbye', performer: 'The Beatles' }]);
  });

  it('turns a JSON object keyed by name into key/value rows', async () => {
    const json = source('json', 'tags.json', '{"Oasis":["britpop"],"Blur":["britpop"]}', 2);
    const page = await readSourcePage(json);
    expect(page.rows).toEqual([
      { key: 'Oasis', value: ['britpop'] },
      { key: 'Blur', value: ['britpop'] },
    ]);
  });

  it('clamps nonsense paging input', async () => {
    const jsonl = source('jsonl', 'clamp.jsonl', lines.join('\n'), 7);
    const page = await readSourcePage(jsonl, { page: -4, pageSize: 10_000 });
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(200);
  });
});

describe('parseCsvLine', () => {
  it('handles quoted commas, doubled quotes and empty fields', () => {
    expect(parseCsvLine('a,"b, c","say ""hi""",,e')).toEqual(['a', 'b, c', 'say "hi"', '', 'e']);
  });
});

describe('foldText', () => {
  it('strips diacritics including the Polish ł', () => {
    expect(foldText('Łódź Beyoncé Żółć')).toBe('lodz beyonce zolc');
  });
});
