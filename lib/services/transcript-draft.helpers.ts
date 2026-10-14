/**
 * Pure helpers for the transcript → lesson draft (CNT-6 / CNT-8):
 * the stored-draft shape, the anonymiser and the song-match mapping.
 * No I/O here — `transcript-draft.ts` owns the database.
 */

import type { TranscriptDraft } from '@/lib/ai/schemas/transcript-draft';

export const TRANSCRIPT_DRAFT_WORKFLOW = 'transcript-draft';
/** Placeholder the student's name is replaced with before anything leaves the house. */
export const STUDENT_PLACEHOLDER = 'Uczeń';
/** `find_similar_songs` trigram score at/above which a catalogue hit is taken as *the* song. */
export const SONG_MATCH_THRESHOLD = 0.6;

export type SimilarSongRow = { id: string; title: string; author: string; similarity: number };

export type SongCandidate = {
  songId: string;
  title: string;
  author: string | null;
  similarity: number;
};

export type SongResolution =
  | ({ match: 'matched' } & SongCandidate)
  | { match: 'candidates'; candidates: SongCandidate[] }
  | { match: 'new' };

export type AcceptedItems = {
  notes: boolean;
  songs: number[];
  homework: number[];
  nextLesson: number[];
};

/** What `ai_workflow_runs.step_results.draft` holds for a `transcript-draft` run. */
export type StoredTranscriptDraft = {
  draft: TranscriptDraft;
  resolvedSongs: SongResolution[];
  generatedAt: string;
  model: string;
  accepted: AcceptedItems;
};

export type TranscriptDraftRecord = StoredTranscriptDraft & { runId: string };

export const EMPTY_ACCEPTED: AcceptedItems = {
  notes: false,
  songs: [],
  homework: [],
  nextLesson: [],
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One pattern per name part: the whole word, plus — for parts of 4+ letters —
 * the stem (final vowel dropped) with up to three trailing letters, which
 * covers Polish declension ("Piotra", "Piotrze", "Kubie", "Ani"). Short parts
 * match whole-word only so "Ewa" never eats "ewangelia".
 */
function namePatterns(part: string): string[] {
  const whole = `(?<!\\p{L})${escapeRegex(part)}(?!\\p{L})`;
  if (part.length < 4) return [whole];
  const stem = /[aeiouyąęó]$/i.test(part) ? part.slice(0, -1) : part;
  return [whole, `(?<!\\p{L})${escapeRegex(stem)}\\p{L}{0,3}(?!\\p{L})`];
}

/**
 * Replace the student's full name, and each part of it, with `Uczeń`.
 * Case-insensitive, Unicode-aware. Cheap on purpose — this is a privacy
 * floor for a free-tier model, not NER.
 */
export function anonymiseTranscript(
  text: string,
  names: { fullName: string | null; firstName: string | null }
): string {
  const parts = new Set<string>();
  if (names.fullName?.trim()) parts.add(names.fullName.trim());
  for (const raw of [names.fullName, names.firstName]) {
    for (const p of (raw ?? '').split(/[\s-]+/)) if (p.length >= 3) parts.add(p);
  }
  // Longest first so "Jan Kowalski" goes before "Jan" / "Kowalski".
  const ordered = [...parts].sort((a, b) => b.length - a.length);
  let out = text;
  for (const part of ordered) {
    for (const pattern of namePatterns(part)) {
      out = out.replace(new RegExp(pattern, 'giu'), STUDENT_PLACEHOLDER);
    }
  }
  return out;
}

/**
 * `find_similar_songs` rows → what the review card needs. Same convention as
 * the CSV importer (`findOrCreateSong`): ≥ 0.6 is a match, anything else
 * with hits is a candidate list, no hits is a new song.
 */
export function resolveSongMatch(rows: SimilarSongRow[] | null | undefined): SongResolution {
  if (!rows || rows.length === 0) return { match: 'new' };
  const sorted = [...rows].sort((a, b) => b.similarity - a.similarity);
  const toCandidate = (r: SimilarSongRow): SongCandidate => ({
    songId: r.id,
    title: r.title,
    author: r.author || null,
    similarity: r.similarity,
  });
  const best = sorted[0];
  if (best.similarity >= SONG_MATCH_THRESHOLD) return { match: 'matched', ...toCandidate(best) };
  return { match: 'candidates', candidates: sorted.map(toCandidate) };
}

/** Add one accepted item; idempotent. */
export function markAccepted(
  accepted: AcceptedItems,
  item: { kind: 'notes' } | { kind: 'songs' | 'homework' | 'nextLesson'; index: number }
): AcceptedItems {
  if (item.kind === 'notes') return { ...accepted, notes: true };
  const list = accepted[item.kind];
  if (list.includes(item.index)) return accepted;
  return { ...accepted, [item.kind]: [...list, item.index].sort((a, b) => a - b) };
}

/** Append a block to existing notes with a `---` separator; never overwrites. */
export function appendNotes(existing: string | null | undefined, block: string): string {
  const current = existing?.trim() ?? '';
  const addition = block.trim();
  if (!current) return addition;
  return `${current}\n\n---\n\n${addition}`;
}
