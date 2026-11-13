import { createReadStream, readFileSync } from 'node:fs';

import { csvRecord, parseCsvLine } from './csv';
import type { HubSource, SourcePage, SourceQuery, SourceRow } from './private-data.types';

export const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CHUNK_BYTES = 1 << 20;
const ASCII = /^[\x00-\x7f]*$/;

/** Lower-case without diacritics, so "zolta" finds "Żółta" and "beyonce" finds "Beyoncé". */
export function foldText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase();
}

function matches(raw: string, foldedQuery: string): boolean {
  if (!foldedQuery) return true;
  return (ASCII.test(raw) ? raw.toLowerCase() : foldText(raw)).includes(foldedQuery);
}

/** `false` stops the scan. */
type RowVisitor = (raw: string, parse: () => SourceRow) => boolean;

/**
 * Calls `onLine` for every line, reading the file in 1 MB chunks. Lines are handled synchronously
 * inside a chunk: one `await` per megabyte instead of one per line, which under the dev server's
 * async instrumentation is the difference between ~1 s and ~30 s for a 680k-line file.
 */
async function scanLines(path: string, onLine: (line: string) => boolean): Promise<void> {
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: CHUNK_BYTES });
  let rest = '';
  try {
    for await (const chunk of stream) {
      const lines = (rest + (chunk as string)).split('\n');
      rest = lines.pop() ?? '';
      for (const line of lines) if (!onLine(line.replace(/\r$/, ''))) return;
    }
    if (rest) onLine(rest.replace(/\r$/, ''));
  } finally {
    stream.destroy();
  }
}

async function visitRows(source: HubSource, visit: RowVisitor): Promise<void> {
  if (source.format === 'json') {
    const doc: unknown = JSON.parse(readFileSync(source.path, 'utf8'));
    // A JSON source is a list of rows or an object keyed by name (artist tags, genres).
    const rows: SourceRow[] = Array.isArray(doc)
      ? (doc as SourceRow[])
      : Object.entries(doc as Record<string, unknown>).map(([key, value]) => ({ key, value }));
    for (const row of rows) if (!visit(JSON.stringify(row), () => row)) return;
    return;
  }
  let header: string[] | null = source.format === 'csv' ? null : [];
  await scanLines(source.path, (line) => {
    if (header === null) {
      header = parseCsvLine(line);
      return true;
    }
    if (!line.trim()) return true;
    const names = header;
    return visit(line, () =>
      source.format === 'csv' ? csvRecord(names, line) : (JSON.parse(line) as SourceRow)
    );
  });
}

function columnsOf(rows: SourceRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

/**
 * One page of a source, optionally filtered by a free-text query over the raw line. Without a query
 * reading stops after the page (the total comes from the manifest); with one the whole file is
 * scanned to count matches.
 */
export async function readSourcePage(source: HubSource, query: SourceQuery = {}): Promise<SourcePage> {
  const pageSize = Math.min(Math.max(Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE), 1), MAX_PAGE_SIZE);
  const page = Math.max(Math.floor(query.page ?? 1), 1);
  const foldedQuery = foldText(query.q?.trim() ?? '');
  const start = (page - 1) * pageSize;
  const rows: SourceRow[] = [];
  const rowNumbers: number[] = [];
  let matched = 0;
  let rowNumber = -1;
  await visitRows(source, (raw, parse) => {
    rowNumber += 1;
    if (!matches(raw, foldedQuery)) return true;
    if (matched >= start && matched < start + pageSize) {
      rows.push(parse());
      rowNumbers.push(rowNumber);
    }
    matched += 1;
    return Boolean(foldedQuery) || matched < start + pageSize;
  });
  const total = foldedQuery ? matched : source.rows;
  return { rows, rowNumbers, columns: columnsOf(rows), total, page, pageSize };
}
