/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { TabRow } from './private-data.types';
import { facet, getTab, getTabDetail, loadTabIndex, searchTabs, tabFilePath } from './tabs';

const SCALE = 'a'.repeat(40);
const SONG = 'b'.repeat(40);
const ESCAPE = 'c'.repeat(40);

function row(sha1: string, title: string, extra: Partial<TabRow>): TabRow {
  return {
    sha1,
    path: `D/Demo/Demo - ${title}.gp5`,
    artist: 'Demo',
    title,
    format: 'gp5',
    parse: 'ok',
    size: 4,
    tempo: 90,
    measures: 2,
    tracks: 1,
    roles: ['guitar'],
    tunings: ['standard E'],
    capo: 0,
    markers: 0,
    lyrics: false,
    exercise: null,
    versions: 1,
    entity: null,
    ...extra,
  };
}

const ROWS = [
  row(SCALE, 'C Major Scale', { exercise: { category: 'exercise collections', topic: 'scales & arpeggios' } }),
  row(SONG, 'Żółta Piosenka', { roles: ['guitar', 'bass'], tunings: ['drop D', 'bass standard E'] }),
  row(ESCAPE, 'Escape', { path: '../../manifest.json' }),
];

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lab-tabs-'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version: 1, sources: [], counts: {} }));
  mkdirSync(join(dir, 'tabs', 'files', 'D', 'Demo'), { recursive: true });
  mkdirSync(join(dir, 'tabs', 'details', 'bb'), { recursive: true });
  writeFileSync(join(dir, 'tabs', 'index.jsonl'), ROWS.map((r) => JSON.stringify(r)).join('\n'));
  writeFileSync(join(dir, 'tabs', 'files', 'D', 'Demo', 'Demo - Żółta Piosenka.gp5'), 'GP5!');
  writeFileSync(join(dir, 'tabs', 'details', 'bb', `${SONG}.json`), JSON.stringify({ sha1: SONG, tempo: 90 }));
  process.env.PRIVATE_DATA_DIR = dir;
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.PRIVATE_DATA_DIR;
});

describe('tab library', () => {
  it('searches titles without diacritics and filters by kind, tuning and instrument', () => {
    const tabs = loadTabIndex()?.tabs ?? [];
    expect(searchTabs(tabs, { q: 'zolta' }).tabs.map((t) => t.sha1)).toEqual([SONG]);
    expect(searchTabs(tabs, { kind: 'exercises' }).tabs.map((t) => t.sha1)).toEqual([SCALE]);
    expect(searchTabs(tabs, { kind: 'songs', tuning: 'drop D', role: 'bass' }).total).toBe(1);
    expect(searchTabs(tabs, { topic: 'scales & arpeggios' }).total).toBe(1);
  });

  it('offers filter values most common first', () => {
    expect(facet(ROWS, (tab) => tab.roles)).toEqual(['guitar', 'bass']);
  });

  it('only knows sha1s from the index', () => {
    expect(getTab(SONG)?.title).toBe('Żółta Piosenka');
    expect(getTab('d'.repeat(40))).toBeNull();
    expect(getTab('../manifest')).toBeNull();
    expect(getTabDetail(SONG)).toEqual({ sha1: SONG, tempo: 90 });
  });

  it('never resolves a file outside the library folder', () => {
    expect(tabFilePath(SONG)).toMatch(/Demo - Żółta Piosenka\.gp5$/);
    expect(tabFilePath(ESCAPE)).toBeNull();
    expect(tabFilePath(SCALE)).toBeNull(); // in the index, file missing
  });
});
