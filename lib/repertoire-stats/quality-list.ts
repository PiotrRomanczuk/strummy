/**
 * The data-quality view of the repertoire statistics (SNG-13/14): every song that breaks a quality rule or that its
 * recording can complete, the songs most students play first, then the lowest scores.
 */

import type { CollectionQuality, RecordQuality } from '@/lib/data-quality/quality.types';
import type { PendingSuggestion } from '@/lib/song-suggestions/fields';

import type { FillSuggestion } from './fill';
import type { RepertoireSong } from './repertoire-song';

/** The fix-queue entry that narrows the list to the songs a recording can complete. */
export const FILL_RULE = 'fill';
/** The fix-queue entry that narrows the list to the songs with open AI proposals (SNG-15). */
export const AI_RULE = 'ai';

export interface QualityRow {
  song: { id: string; title: string; author: string | null; students: number };
  quality: RecordQuality;
  suggestions: FillSuggestion[];
  ai: PendingSuggestion[];
}

export interface QualityReportInput {
  quality: CollectionQuality;
  suggestions: Map<string, FillSuggestion[]>;
  /** Open AI proposals per song; absent before any were generated. */
  ai?: Map<string, PendingSuggestion[]>;
}

/** Open proposals grouped by song. */
export function bySong(suggestions: PendingSuggestion[]): Map<string, PendingSuggestion[]> {
  const grouped = new Map<string, PendingSuggestion[]>();
  for (const suggestion of suggestions) {
    grouped.set(suggestion.songId, [...(grouped.get(suggestion.songId) ?? []), suggestion]);
  }
  return grouped;
}

export function qualityRowsOf(
  report: QualityReportInput,
  songs: RepertoireSong[],
  rule: string | null
): QualityRow[] {
  const songOf = new Map(songs.map((song) => [song.id, song]));
  const matches = (row: QualityRow) => {
    if (rule === FILL_RULE) return row.suggestions.length > 0;
    if (rule === AI_RULE) return row.ai.length > 0;
    if (rule) return row.quality.failedRuleIds.includes(rule);
    return row.quality.failedRuleIds.length > 0 || row.suggestions.length > 0 || row.ai.length > 0;
  };
  return report.quality.records
    .flatMap((quality): QualityRow[] => {
      const song = songOf.get(quality.id);
      if (!song) return [];
      const { id, title, author, students } = song;
      return [
        {
          song: { id, title, author, students },
          quality,
          suggestions: report.suggestions.get(quality.id) ?? [],
          ai: report.ai?.get(quality.id) ?? [],
        },
      ];
    })
    .filter(matches)
    .sort(
      (a, b) =>
        b.song.students - a.song.students ||
        a.quality.score - b.quality.score ||
        a.song.title.localeCompare(b.song.title)
    );
}

/** How many songs the recording can complete, and how many values that is. */
export function fillCountsOf(suggestions: Map<string, FillSuggestion[]>) {
  const lists = [...suggestions.values()].filter((list) => list.length > 0);
  return { songs: lists.length, values: lists.reduce((sum, list) => sum + list.length, 0) };
}
