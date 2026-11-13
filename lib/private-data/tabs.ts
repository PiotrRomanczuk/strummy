import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { hubPath, isPrivateDataAvailable } from './config';
import type { TabDetail, TabPage, TabQuery, TabRow } from './private-data.types';
import { foldQuery } from './songs';

const SHA1 = /^[0-9a-f]{40}$/;
const PAGE_SIZE = 50;

interface TabIndex {
  file: string;
  mtimeMs: number;
  tabs: (TabRow & { search: string })[];
  bySha: Map<string, TabRow>;
}

// 54 864 rows, ~25 MB: parsed once per hub build and kept across dev-server reloads.
const cache = globalThis as typeof globalThis & { __labTabs?: TabIndex };

export function loadTabIndex(): TabIndex | null {
  if (!isPrivateDataAvailable()) return null;
  const file = hubPath('tabs', 'index.jsonl');
  if (!existsSync(file)) return null;
  const { mtimeMs } = statSync(file);
  let index = cache.__labTabs;
  if (!index || index.file !== file || index.mtimeMs !== mtimeMs) {
    const tabs = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const row = JSON.parse(line) as TabRow;
        return { ...row, search: foldQuery(`${row.artist} ${row.title}`) };
      });
    index = { file, mtimeMs, tabs, bySha: new Map(tabs.map((tab) => [tab.sha1, tab])) };
    cache.__labTabs = index;
  }
  return index;
}

function matchesKind(tab: TabRow, kind: TabQuery['kind']): boolean {
  if (kind === 'exercises') return tab.exercise !== null;
  if (kind === 'songs') return tab.exercise === null;
  return true;
}

export function searchTabs(tabs: (TabRow & { search: string })[], query: TabQuery): TabPage {
  const words = foldQuery(query.q ?? '')
    .split(' ')
    .filter(Boolean);
  const matching = tabs.filter(
    (tab) =>
      words.every((word) => tab.search.includes(word)) &&
      matchesKind(tab, query.kind) &&
      (!query.tuning || tab.tunings.includes(query.tuning)) &&
      (!query.role || tab.roles.includes(query.role)) &&
      (!query.topic || tab.exercise?.topic === query.topic)
  );
  const page = Math.max(query.page ?? 1, 1);
  const start = (page - 1) * PAGE_SIZE;
  return { tabs: matching.slice(start, start + PAGE_SIZE), total: matching.length, page, pageSize: PAGE_SIZE };
}

/** Distinct values of a list field, most common first — the filter choices. */
export function facet(tabs: TabRow[], pick: (tab: TabRow) => (string | null | undefined)[]): string[] {
  const counts = new Map<string, number>();
  for (const tab of tabs) for (const value of pick(tab)) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

export function getTab(sha1: string): TabRow | null {
  return SHA1.test(sha1) ? (loadTabIndex()?.bySha.get(sha1) ?? null) : null;
}

/** Everything parsed from one tab file (transcribers' e-mails already masked by the hub). */
export function getTabDetail(sha1: string): TabDetail | null {
  if (!getTab(sha1)) return null;
  const file = hubPath('tabs', 'details', sha1.slice(0, 2), `${sha1}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as TabDetail) : null;
}

/** The tab's file on disk — only for a sha1 in the index, and only inside the library folder. */
export function tabFilePath(sha1: string): string | null {
  const tab = getTab(sha1);
  if (!tab) return null;
  const root = resolve(hubPath('tabs', 'files'));
  const file = resolve(root, tab.path);
  return file.startsWith(root + sep) && existsSync(file) ? file : null;
}
