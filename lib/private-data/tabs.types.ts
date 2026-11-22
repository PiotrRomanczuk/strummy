// Types of the Guitar Pro tab library (`tabs/index.jsonl`, `tabs/details/`).

/** A row of `tabs/index.jsonl`: one unique Guitar Pro file of the tab library. */
export interface TabRow {
  sha1: string;
  /** Relative to `tabs/files/`. */
  path: string;
  artist: string;
  title: string;
  format: 'gp3' | 'gp4' | 'gp5' | 'gtp' | string;
  /** "ok", or "skipped" for GP1/GP2 files the parser cannot read. */
  parse: string;
  size: number;
  tempo: number | null;
  measures: number | null;
  tracks: number;
  roles: string[];
  tunings: string[];
  capo: number;
  markers: number;
  lyrics: boolean;
  exercise: { category: string; topic: string } | null;
  versions: number;
  entity: string | null;
}

export interface TabTrack {
  number: number;
  name: string;
  tuning: number[];
  capo: number;
  frets?: number;
  instrument?: number;
  percussion?: boolean;
  notes: number;
  max_fret?: number;
  chord_diagrams?: number;
  techniques?: Record<string, number>;
}

/** `tabs/details/<aa>/<sha1>.json`: the parse of one file plus where its copies came from. */
export interface TabDetail {
  sha1: string;
  parse: string;
  version?: string;
  title?: string;
  subtitle?: string;
  artist?: string;
  album?: string;
  tab?: string;
  tempo?: number;
  measures?: number;
  time_signatures?: string[];
  markers?: { title: string; bar: number }[];
  instructions?: string;
  notice?: string[];
  lyrics?: string[];
  tracks?: TabTrack[];
  sources?: [string, string, string | null][];
}

export interface TabQuery {
  q?: string;
  kind?: 'all' | 'songs' | 'exercises';
  tuning?: string;
  role?: string;
  topic?: string;
  page?: number;
}

export interface TabPage {
  tabs: TabRow[];
  total: number;
  page: number;
  pageSize: number;
}
