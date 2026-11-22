/**
 * Shapes of the private data hub the Lab reads (built outside this repo by song2logic's
 * `research/hub/build_hub.py`). The hub exists only on the owner's Mac; nothing here is ever
 * deployed or committed.
 */

export type SourceFormat = 'jsonl' | 'csv' | 'json';
export type SourceGroup = 'personal' | 'analysis' | 'tabs' | 'dataset';

export interface HubSource {
  id: string;
  label: string;
  description: string;
  path: string;
  format: SourceFormat;
  group: SourceGroup;
  license: string;
  rows: number;
  bytes: number;
  modified: string;
}

export interface HubManifest {
  version: number;
  built: string;
  counts: Record<string, number>;
  sources: HubSource[];
}

export type SourceRow = Record<string, unknown>;

export interface SourcePage {
  rows: SourceRow[];
  /** Row numbers in the source file (0-based), parallel to `rows`. */
  rowNumbers: number[];
  columns: string[];
  /** Rows matching the query (all rows without one). */
  total: number;
  page: number;
  pageSize: number;
}

export interface SourceQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}
