/**
 * One song's progressions in Strummy against the recording (SNG-13). Both sides are compared as sounding triads:
 * Strummy's chords moved by the capo and by the shift that explains its chords (a guitar tuned down), so a song
 * entered in shapes still matches the recording. Strummy knows the order of its chords only from the chord sheet.
 */

import * as z from 'zod';

import type { ParsedChord } from '@/lib/music-theory/chord-parser';
import { extractChordSequence } from '@/lib/music-theory/chord-sequence';

import { chordShift, isChordSymbol, knownChords, triad } from './chord-agreement';
import { collapse } from './progressions';
import type { MeasuredProgression, RepertoireSong } from './repertoire-song';

/** match: same order in the sheet · unordered: no sheet, the chords are there · reordered: the sheet has them in
 * another order · recordingOnly: Strummy does not have these chords. */
export type ProgressionStatus = 'match' | 'unordered' | 'reordered' | 'recordingOnly';

export interface ProgressionComparison {
  roman: string[];
  heard: string[];
  bars: number;
  status: ProgressionStatus;
  /** Strummy's chord names for the progression; empty for recordingOnly. */
  strummy: string[];
}

interface Sounding {
  name: string;
  triad: string;
}

const triadOf = (name: string) => {
  const chord = knownChords(name)[0];
  return chord ? triad(chord, 0) : `?${name}`;
};

const isContiguous = (haystack: string[], needle: string[]) =>
  haystack.some((_, start) => needle.every((item, i) => haystack[start + i] === item));

function compareOne(
  progression: MeasuredProgression,
  sheet: Sounding[],
  shapes: Sounding[]
): ProgressionComparison {
  const pairs = collapse(
    progression.chords.map((chord, i) => ({ chord, roman: progression.roman[i] ?? '' })),
    (a, b) => a.chord === b.chord
  );
  const heard = pairs.map((pair) => triadOf(pair.chord));
  const base = {
    roman: pairs.map((pair) => pair.roman),
    heard: pairs.map((pair) => pair.chord),
    bars: progression.bars,
  };
  const nameOf = (pool: Sounding[], wanted: string) =>
    pool.find((item) => item.triad === wanted)?.name ?? '';
  const sheetTriads = sheet.map((item) => item.triad);
  if (sheet.length > 0 && isContiguous(sheetTriads, heard)) {
    const start = sheetTriads.findIndex((_, s) => heard.every((t, i) => sheetTriads[s + i] === t));
    const strummy = sheet.slice(start, start + heard.length).map((item) => item.name);
    return { ...base, status: 'match', strummy };
  }
  const pool = sheet.length > 0 ? sheet : shapes;
  const hasAll = heard.every((wanted) => pool.some((item) => item.triad === wanted));
  if (!hasAll || pool.length === 0) return { ...base, status: 'recordingOnly', strummy: [] };
  return {
    ...base,
    status: sheet.length > 0 ? 'reordered' : 'unordered',
    strummy: heard.map((wanted) => nameOf(pool, wanted)),
  };
}

/** Each progression heard in the recording with what Strummy has for it; empty without a measurement. */
export function compareProgressions(
  song: RepertoireSong,
  sheet: string | null
): ProgressionComparison[] {
  const measured = song.measured;
  if (!measured) return [];
  const { chords, capo } = song.entered;
  const shift = capo + (chordShift(chords, capo, measured.chords)?.shift ?? 0);
  const sounding = (chord: ParsedChord): Sounding => ({
    name: chord.raw,
    triad: triad(chord, shift),
  });
  const sheetChords = collapse(
    extractChordSequence(sheet).filter(isChordSymbol).map(sounding),
    (a, b) => a.triad === b.triad
  );
  const shapes = knownChords(chords).map(sounding);
  return measured.progressions.map((progression) => compareOne(progression, sheetChords, shapes));
}

const SectionsSchema = z.array(
  z.object({ label: z.string(), bars: z.number(), start_s: z.number(), first_bar: z.number() })
);
const BarChordsSchema = z.array(z.object({ bar: z.number(), chord: z.string() }));
const VocabularySchema = z.array(z.object({ chord: z.string(), roman: z.string() }));

export interface SongSection {
  label: string;
  bars: number;
  startS: number;
  chords: string[];
  roman: string[];
}

/** Longest chord run shown under a section; the rest is cut. */
export const SECTION_CHORDS = 6;

/** The recording's sections with the chords of their bars (repeats merged); empty when the data does not parse. */
export function sectionsOf(
  sections: unknown,
  barChords: unknown,
  vocabulary: unknown
): SongSection[] {
  const parsed = SectionsSchema.safeParse(sections);
  if (!parsed.success) return [];
  const bars = BarChordsSchema.safeParse(barChords);
  const romans = new Map(
    (VocabularySchema.safeParse(vocabulary).data ?? []).map((entry) => [entry.chord, entry.roman])
  );
  return parsed.data.map((section) => {
    const inside = (bars.data ?? [])
      .filter((bar) => bar.bar >= section.first_bar && bar.bar < section.first_bar + section.bars)
      .map((bar) => bar.chord);
    const chords = collapse(inside).slice(0, SECTION_CHORDS);
    return {
      label: section.label,
      bars: section.bars,
      startS: section.start_s,
      chords,
      roman: chords.map((chord) => romans.get(chord) ?? '?'),
    };
  });
}

/** What the progressions view needs of one song beyond the repertoire row: its chord sheet and sections. */
export interface SongDetail {
  sheet: string | null;
  sections: SongSection[];
}
