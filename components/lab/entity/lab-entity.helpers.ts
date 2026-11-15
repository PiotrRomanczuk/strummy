import type { SourceRow } from '@/lib/private-data/private-data.types';

import { formatCell } from '../lab.helpers';

/** 75.3 → "1:15". */
export function formatSeconds(seconds: number): string {
  const whole = Math.max(Math.floor(seconds), 0);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Chord ID rows store `[[seconds, "Em"], …]`; keep only well-formed pairs. */
export function chordEvents(value: unknown): { at: number; chord: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((pair) =>
    Array.isArray(pair) && typeof pair[0] === 'number' && typeof pair[1] === 'string'
      ? [{ at: pair[0], chord: pair[1] }]
      : []
  );
}

/** Chordonomicon spells F# as "Fs" and minor as "min": "Fsmin/Cs" → "F#m/C#". */
export function chordonomiconChord(token: string): string {
  return token
    .split('/')
    .map((part) => part.replace(/^([A-G])s/, '$1#').replace(/min(?=\d|$)/, 'm'))
    .join('/');
}

/** "<verse_1> G Fs D <chorus_1> …" → one entry per part, chords in readable spelling. */
export function chordSheetParts(text: unknown): { part: string; chords: string[] }[] {
  if (typeof text !== 'string') return [];
  const parts: { part: string; chords: string[] }[] = [];
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const tag = /^<([^>]+)>$/.exec(token);
    if (tag) parts.push({ part: tag[1].replace(/_/g, ' '), chords: [] });
    else if (parts.length === 0) parts.push({ part: '', chords: [chordonomiconChord(token)] });
    else parts[parts.length - 1].chords.push(chordonomiconChord(token));
  }
  return parts;
}

const SKIPPED_FIELDS = new Set(['chords', 'positions', 'analysis', 'versions', 'salami_chords', 'song', 'compare']);

/** The scalar-ish fields of a row as label/value pairs; bulky fields stay in the JSON dialog. */
export function recordFields(row: SourceRow, limit = 14): [string, string][] {
  return Object.entries(row)
    .filter(([key, value]) => !SKIPPED_FIELDS.has(key) && value !== null && value !== '' && value !== undefined)
    .slice(0, limit)
    .map(([key, value]) => [key, formatCell(value)]);
}
