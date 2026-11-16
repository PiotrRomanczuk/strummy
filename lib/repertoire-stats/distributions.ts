/**
 * Distributions of the repertoire (SNG-13): one histogram per measure, with the selected song's bin marked and
 * its percentile ("higher than 80% of the repertoire"). Measured values win over entered ones, because the
 * recording is the same yardstick for every song.
 */

import { NOTE_TO_SEMITONE } from '@/lib/music-theory/chromatic';
import { midiName } from '@/lib/music-theory/transcription-roll';

import type { RepertoireSong } from './repertoire-song';

export type DistributionId = 'tempo' | 'key' | 'vocalHigh' | 'vocalLow' | 'bassDensity';

export interface Bin {
  label: string;
  count: number;
  isSelected: boolean;
}

export interface Distribution {
  id: DistributionId;
  bins: Bin[];
  /** Songs with a value. */
  total: number;
  /** The selected song's value and the share of the others below it; null when it has no value. */
  selected: { label: string; below: number } | null;
}

interface Measure {
  id: DistributionId;
  value: (song: RepertoireSong) => number | null;
  /** Bin index of a value and the label of each bin, from the values present. */
  bins: (values: number[]) => { labels: string[]; indexOf: (value: number) => number };
  format: (value: number) => string;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TEMPO_STEP = 10;
const DENSITY_STEP = 0.5;

/** A key label as a number: major keys 0–11, minor 12–23; null for anything unreadable. */
export function keyIndex(key: string | null): number | null {
  if (!key) return null;
  const isMinor = key.endsWith('m');
  const root = NOTE_TO_SEMITONE[isMinor ? key.slice(0, -1) : key];
  return root === undefined ? null : root + (isMinor ? 12 : 0);
}

const keyName = (index: number) => `${PITCH_NAMES[index % 12]}${index >= 12 ? 'm' : ''}`;

const stepBins = (step: number, format: (low: number) => string) => (values: number[]) => {
  const first = Math.floor(Math.min(...values) / step);
  const last = Math.floor(Math.max(...values) / step);
  const labels = Array.from({ length: last - first + 1 }, (_, i) => format((first + i) * step));
  return { labels, indexOf: (value: number) => Math.floor(value / step) - first };
};

const MEASURES: Measure[] = [
  {
    id: 'tempo',
    value: (song) => song.measured?.bpm ?? song.entered.tempo,
    bins: stepBins(TEMPO_STEP, (low) => `${low}–${low + TEMPO_STEP - 1}`),
    format: (value) => `${Math.round(value)} BPM`,
  },
  {
    id: 'key',
    value: (song) => keyIndex(song.measured?.key ?? song.entered.key),
    bins: () => ({ labels: Array.from({ length: 24 }, (_, i) => keyName(i)), indexOf: (v) => v }),
    format: keyName,
  },
  {
    id: 'vocalHigh',
    value: (song) => song.transcription?.vocals?.high ?? null,
    bins: stepBins(1, midiName),
    format: midiName,
  },
  {
    id: 'vocalLow',
    value: (song) => song.transcription?.vocals?.low ?? null,
    bins: stepBins(1, midiName),
    format: midiName,
  },
  {
    id: 'bassDensity',
    value: (song) => song.transcription?.bass?.perBar ?? null,
    bins: stepBins(DENSITY_STEP, (low) => `${low}–${low + DENSITY_STEP}`),
    format: (value) => value.toFixed(1),
  },
];

function distribution(measure: Measure, songs: RepertoireSong[], selectedId: string | null) {
  const valued = songs.flatMap((song) => {
    const value = measure.value(song);
    return value === null ? [] : [{ id: song.id, value }];
  });
  const selected = valued.find((entry) => entry.id === selectedId) ?? null;
  if (valued.length === 0) return { id: measure.id, bins: [], total: 0, selected: null };
  const { labels, indexOf } = measure.bins(valued.map((entry) => entry.value));
  const counts = labels.map(() => 0);
  for (const entry of valued) counts[indexOf(entry.value)] += 1;
  const selectedBin = selected ? indexOf(selected.value) : -1;
  const others = valued.filter((entry) => entry.id !== selectedId);
  return {
    id: measure.id,
    bins: labels.map((label, i) => ({ label, count: counts[i], isSelected: i === selectedBin })),
    total: valued.length,
    selected: selected
      ? {
          label: measure.format(selected.value),
          below: others.length
            ? Math.round(
                (others.filter((e) => e.value < selected.value).length / others.length) * 100
              )
            : 0,
        }
      : null,
  };
}

/** Every distribution of the repertoire, the selected song (if any) marked in each. */
export function distributionsOf(
  songs: RepertoireSong[],
  selectedId: string | null
): Distribution[] {
  return MEASURES.map((measure) => distribution(measure, songs, selectedId));
}
