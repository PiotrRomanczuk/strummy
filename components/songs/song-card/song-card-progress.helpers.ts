import type { CardPart } from '@/lib/music-theory/song-card';
import {
  deriveSongProgress,
  latestByLabel,
  type SongProgressMark,
  type SongProgressStatus,
} from '@/lib/services/song-part-progress.helpers';

import { PRACTICE_RATES } from './song-card-link.helpers';

/** The tempos a teacher taps, in percent of the original: the card's practice ladder. */
export const TEMPO_CHOICES: number[] = PRACTICE_RATES.map((rate) => Math.round(rate * 100));

/** One row of the progress panel: a part of the song by its form letter, or the whole song (label null). */
export interface ProgressRow {
  label: string | null;
  /** The first part with this letter, for its name; null for the whole song. */
  part: CardPart | null;
  /** The newest mark of this row, or null when it was never marked. */
  latest: SongProgressMark | null;
}

/** Distinct form letters in the order they first appear; repeats of a part share their letter. */
export function partLabels(parts: CardPart[]): string[] {
  return [...new Set(parts.map((part) => part.label))];
}

/** The rows to mark: one per part letter, or a single "whole song" row when the song has no parts. */
export function progressRows(parts: CardPart[], marks: SongProgressMark[]): ProgressRow[] {
  const latest = latestByLabel(marks);
  const labels = partLabels(parts);
  if (labels.length === 0) return [{ label: null, part: null, latest: latest.get(null) ?? null }];
  return labels.map((label) => ({
    label,
    part: parts.find((part) => part.label === label) ?? null,
    latest: latest.get(label) ?? null,
  }));
}

/** The song's status from its parts, by the same rule the rest of Strummy uses (#1136). */
export function progressStatus(parts: CardPart[], marks: SongProgressMark[]): SongProgressStatus {
  return deriveSongProgress(partLabels(parts), marks).status;
}
