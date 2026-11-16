import { midiName } from '@/lib/music-theory/transcription-roll';
import type { RepertoireSong, TrackSummary } from '@/lib/repertoire-stats/repertoire-song';

export const REPERTOIRE_STATS_PATH = '/dashboard/admin/repertoire-stats';
export const VIEWS = ['coverage', 'songs', 'mismatches', 'distributions'] as const;
export const MAX_COMPARE = 3;

export type RepertoireView = (typeof VIEWS)[number];

/** The page state, all of it in the URL so a view can be linked (LIST_TABLE_PATTERN.md). */
export interface StatsParams {
  view: RepertoireView;
  song: string | null;
  compare: string[];
}

export type RawStatsParams = { view?: string; song?: string; compare?: string };

export function parseStatsParams(raw: RawStatsParams): StatsParams {
  const view = VIEWS.find((candidate) => candidate === raw.view) ?? 'coverage';
  const compare = (raw.compare ?? '').split(',').filter(Boolean).slice(0, MAX_COMPARE);
  return { view, song: raw.song || null, compare };
}

/** The one way to build a link to a state of the page. */
export function statsHref(params: StatsParams): string {
  const query = new URLSearchParams({ view: params.view });
  if (params.song) query.set('song', params.song);
  if (params.compare.length) query.set('compare', params.compare.join(','));
  return `${REPERTOIRE_STATS_PATH}?${query.toString()}`;
}

/** Adds the song to the comparison, or takes it out; a full comparison drops its oldest song. */
export function toggleCompare(compare: string[], id: string): string[] {
  if (compare.includes(id)) return compare.filter((other) => other !== id);
  return [...compare, id].slice(-MAX_COMPARE);
}

export function rangeLabel(track: TrackSummary | null | undefined): string {
  if (!track || track.low === null || track.high === null) return '—';
  return `${midiName(track.low)}–${midiName(track.high)}`;
}

export const valueOrDash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

export const measuredTempo = (song: RepertoireSong) =>
  song.measured?.bpm ? Math.round(song.measured.bpm) : null;
