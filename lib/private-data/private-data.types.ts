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

/** One song as the hub joined it across sources (a row of `songs.jsonl`). */
export interface SongEntity {
  id: string;
  artist: string;
  title: string;
  /** Folded "artist title" (ASCII lower case) for search. */
  search: string;
  strummy_song_id: string | null;
  spotify_id: string | null;
  youtube_id: string | null;
  /** Source id → how many of its rows belong to this song. */
  sources: Record<string, number>;
  /** Guitar Pro tab versions of the song. */
  tabs: number;
}

/** `entities/<aa>/<id>.json`: the song plus every source's rows (lists) and artist facts (object). */
export interface EntityDocument {
  entity: SongEntity;
  sections: Record<string, SourceRow[] | SourceRow>;
}

export interface SongQuery {
  q?: string;
  /** Source ids the song must appear in. */
  has?: string[];
  sort?: 'sources' | 'name';
  page?: number;
}

export interface SongPage {
  songs: SongEntity[];
  total: number;
  page: number;
  pageSize: number;
}
