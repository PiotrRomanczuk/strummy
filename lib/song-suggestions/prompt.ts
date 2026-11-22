/**
 * The prompt that asks a model for one field of a batch of songs, and the parser that keeps only answers Strummy can
 * store (SNG-15). The model sees titles, artists and the musical facts Strummy has — never anything about students.
 */

import * as z from 'zod';

import { CANONICAL_GENRES } from '@/lib/data-quality/song-genres';
import type { AIMessage } from '@/lib/ai/types';

import { normaliseValue, type SuggestField, type SuggestSong } from './fields';

export interface ParsedSuggestion {
  songId: string;
  field: SuggestField;
  value: string;
  confidence: number;
  reason: string | null;
}

const SYSTEM = [
  "You fill missing data in a guitar teacher's song catalog.",
  'Answer with JSON only: an array of {"i": <song index>, "value": <string>, "confidence": <0..1>, "reason": <string>}.',
  'If you do not know the song or are unsure, give a low confidence instead of guessing confidently; never invent a song.',
  'Write "reason" in Polish, at most 12 words.',
].join(' ');

const GUIDE: Record<SuggestField, string> = {
  category: `Give each song's genre, choosing only from: ${CANONICAL_GENRES.join(', ')}.`,
  level:
    'Rate how hard each song is for a guitar student playing its chords: starter (2–3 open chords, slow), ' +
    'beginner (open chords, simple changes), intermediate (barre chords, quick changes, riffs), ' +
    'advanced (complex chords, solos, fast playing). Answer with one of: starter, beginner, intermediate, advanced.',
  author: "Give each song's original performer (artist or band), as usually written.",
};

const facts = (song: SuggestSong) =>
  Object.fromEntries(
    Object.entries({
      title: song.title,
      artist: song.author,
      current_genre: song.category,
      chords: song.chords?.slice(0, 200),
      tempo: song.tempo,
      key: song.key,
    }).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );

export function buildMessages(field: SuggestField, songs: SuggestSong[]): AIMessage[] {
  const list = songs.map((song, i) => `${i}. ${JSON.stringify(facts(song))}`).join('\n');
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${GUIDE[field]}\n\nSongs:\n${list}` },
  ];
}

const AnswerSchema = z.array(
  z.object({
    i: z.number().int(),
    value: z.string(),
    confidence: z.number(),
    reason: z.string().optional(),
  })
);

const REASON_MAX = 200;

/** The model's JSON array, wherever it sits in the reply (models wrap it in prose or a code fence). */
function jsonArrayOf(content: string): unknown {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Every usable answer: a known song, a value Strummy stores, different from the current one. */
export function parseAnswer(
  field: SuggestField,
  content: string,
  songs: SuggestSong[]
): ParsedSuggestion[] {
  const parsed = AnswerSchema.safeParse(jsonArrayOf(content));
  if (!parsed.success) return [];
  const seen = new Set<number>();
  return parsed.data.flatMap((answer) => {
    const song = songs[answer.i];
    const value = song ? normaliseValue(field, answer.value) : null;
    if (!song || !value || seen.has(answer.i) || value === song[field]) return [];
    seen.add(answer.i);
    return [
      {
        songId: song.id,
        field,
        value,
        confidence: Math.min(1, Math.max(0, answer.confidence)),
        reason: answer.reason?.trim().slice(0, REASON_MAX) || null,
      },
    ];
  });
}
