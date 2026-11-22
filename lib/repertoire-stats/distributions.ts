/**
 * The selected song against the repertoire (SNG-13). Numbers are compared ("faster than 45% of the repertoire",
 * "the fastest in the repertoire"); keys are not, because keys have no order: only how many other songs share the
 * key. Under FEW_SONGS values every song is a point and the standing is a count, not a percentage.
 */

import { NOTE_TO_SEMITONE } from '@/lib/music-theory/chromatic';

import type { RepertoireSong } from './repertoire-song';

export type NumericId = 'tempo' | 'vocalHigh' | 'vocalLow' | 'bassDensity';
export const NUMERIC_IDS: readonly NumericId[] = ['tempo', 'vocalHigh', 'vocalLow', 'bassDensity'];

/** Below this many songs a histogram says more than the data does: show points instead. */
export const FEW_SONGS = 30;

export type Standing =
  | { kind: 'top' | 'bottom' }
  | { kind: 'count'; count: number; of: number }
  | { kind: 'share'; percent: number };

export interface Point {
  id: string;
  title: string;
  value: number;
  isSelected: boolean;
}

export interface NumericDistribution {
  id: NumericId;
  total: number;
  isFew: boolean;
  points: Point[];
  /** Histogram bins (empty when isFew): the lower edge of each and its song count. */
  bins: { low: number; count: number; isSelected: boolean }[];
  step: number;
  selected: { value: number; standing: Standing | null } | null;
}

const MEASURES: Record<
  NumericId,
  { value: (s: RepertoireSong) => number | null; step: number; isUp: boolean }
> = {
  tempo: { value: (song) => song.measured?.bpm ?? null, step: 10, isUp: true },
  vocalHigh: {
    value: (song) => song.transcription?.tracks.Wokal?.high ?? null,
    step: 2,
    isUp: true,
  },
  // "Lower than": the lowest note sits below the others'.
  vocalLow: {
    value: (song) => song.transcription?.tracks.Wokal?.low ?? null,
    step: 2,
    isUp: false,
  },
  bassDensity: {
    value: (song) => song.transcription?.tracks.Bas?.perBar ?? null,
    step: 1,
    isUp: true,
  },
};

function standingOf(
  value: number,
  others: number[],
  isUp: boolean,
  isFew: boolean
): Standing | null {
  if (others.length === 0) return null;
  const beaten = others.filter((other) => (isUp ? other < value : other > value)).length;
  const beating = others.filter((other) => (isUp ? other > value : other < value)).length;
  if (beaten === others.length) return { kind: 'top' };
  if (beating === others.length) return { kind: 'bottom' };
  if (isFew) return { kind: 'count', count: beaten, of: others.length };
  return { kind: 'share', percent: Math.round((beaten / others.length) * 100) };
}

function binsOf(points: Point[], step: number) {
  const values = points.map((point) => point.value);
  const first = Math.floor(Math.min(...values) / step);
  const last = Math.floor(Math.max(...values) / step);
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const low = (first + i) * step;
    const inside = points.filter((point) => Math.floor(point.value / step) === first + i);
    return { low, count: inside.length, isSelected: inside.some((point) => point.isSelected) };
  });
}

export function numericDistribution(
  id: NumericId,
  songs: RepertoireSong[],
  selectedId: string | null
): NumericDistribution {
  const measure = MEASURES[id];
  const points = songs.flatMap((song) => {
    const value = measure.value(song);
    return value === null
      ? []
      : [{ id: song.id, title: song.title, value, isSelected: song.id === selectedId }];
  });
  const isFew = points.length < FEW_SONGS;
  const chosen = points.find((point) => point.isSelected);
  const others = points.filter((point) => !point.isSelected).map((point) => point.value);
  return {
    id,
    total: points.length,
    isFew,
    points: [...points].sort((a, b) => a.value - b.value),
    bins: isFew || points.length === 0 ? [] : binsOf(points, measure.step),
    step: measure.step,
    selected: chosen
      ? { value: chosen.value, standing: standingOf(chosen.value, others, measure.isUp, isFew) }
      : null,
  };
}

export interface KeyDistribution {
  total: number;
  /** One cell per pitch class (0 = C): songs in the major and in the minor key on it. */
  cells: { pitch: number; major: number; minor: number }[];
  selected: { pitch: number; isMinor: boolean; others: number } | null;
}

/** A key label as pitch class and mode; null for anything unreadable. */
export function parseKey(key: string | null): { pitch: number; isMinor: boolean } | null {
  if (!key) return null;
  const isMinor = key.endsWith('m');
  const pitch = NOTE_TO_SEMITONE[isMinor ? key.slice(0, -1) : key];
  return pitch === undefined ? null : { pitch, isMinor };
}

export function keyDistribution(
  songs: RepertoireSong[],
  selectedId: string | null
): KeyDistribution {
  const keyed = songs.flatMap((song) => {
    const key = parseKey(song.measured?.key ?? null);
    return key ? [{ id: song.id, ...key }] : [];
  });
  const cells = Array.from({ length: 12 }, (_, pitch) => ({
    pitch,
    major: keyed.filter((key) => key.pitch === pitch && !key.isMinor).length,
    minor: keyed.filter((key) => key.pitch === pitch && key.isMinor).length,
  }));
  const chosen = keyed.find((key) => key.id === selectedId);
  return {
    total: keyed.length,
    cells,
    selected: chosen
      ? {
          pitch: chosen.pitch,
          isMinor: chosen.isMinor,
          others:
            keyed.filter((key) => key.pitch === chosen.pitch && key.isMinor === chosen.isMinor)
              .length - 1,
        }
      : null,
  };
}
