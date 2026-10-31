/**
 * What a song's chords do harmonically, from its stored data alone. Everything
 * here is computed, so the song card can state it as fact.
 */

import { NOTE_TO_SEMITONE, semitoneDistance } from './chromatic';
import { parseChordsColumn, type ParsedChord } from './chord-parser';
import { extractChordSequence } from './chord-sequence';
import { detectKey } from './key-detection';
import { detectArchetypes, type ProgressionArchetype } from './progression-archetypes';
import { chordToRomanNumeral } from './roman-numeral';

const CHROMATIC = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** A sheet shorter than this is a fragment, not the song's playing order. */
const MIN_SEQUENCE = 4;
/** Share of chords that must belong to a stored key for us to trust it. */
const MIN_KEY_FIT = 0.5;
const BORROWED_IN_MAJOR = [3, 8, 10];
const PERFECT_FOURTH = 5;
const PERFECT_FIFTH = 7;

export type OutsideKind = 'minorDominant' | 'borrowed' | 'secondaryDominant' | 'chromatic';

export interface HarmonyDegree {
  chord: string;
  numeral: string;
  isDiatonic: boolean;
  outsideKind: OutsideKind | null;
  /** The chord a secondary dominant leads to. */
  target: string | null;
}

export interface HarmonyAnalysis {
  /** Key of the chord shapes as written: what the hands play. */
  key: string;
  isKeyGuess: boolean;
  /** Key heard with the capo on, when it differs from `key`. */
  soundingKey: string | null;
  degrees: HarmonyDegree[];
  /** Empty when the playing order is unknown: a chord list proves no progression. */
  archetypes: ProgressionArchetype[];
}

function transposeKey(key: string, semitones: number): string {
  const isMinor = key.endsWith('m');
  const root = isMinor ? key.slice(0, -1) : key;
  const pitch = (NOTE_TO_SEMITONE[root] + semitones + 120) % 12;
  return `${CHROMATIC[pitch]}${isMinor ? 'm' : ''}`;
}

function isMinorDominant(chord: ParsedChord, key: string): boolean {
  if (!key.endsWith('m') || chord.quality !== 'major') return false;
  return semitoneDistance(key.slice(0, -1), chord.root) === PERFECT_FIFTH;
}

function keyFit(chords: ParsedChord[], key: string): number {
  const fitting = chords.filter(
    (chord) => chordToRomanNumeral(chord, key).isDiatonic || isMinorDominant(chord, key)
  );
  return fitting.length / chords.length;
}

function resolveKey(chords: ParsedChord[], storedKey: string | null, capo: number) {
  if (storedKey) {
    const fitting = [transposeKey(storedKey, -capo), storedKey].find(
      (key) => keyFit(chords, key) >= MIN_KEY_FIT
    );
    if (fitting) return { key: fitting, isKeyGuess: false };
  }
  const detected = detectKey(chords);
  return detected && { key: detected.key, isKeyGuess: !detected.isConfident };
}

function classifyOutside(chord: ParsedChord, key: string) {
  const root = key.endsWith('m') ? key.slice(0, -1) : key;
  const distance = semitoneDistance(root, chord.root);
  if (isMinorDominant(chord, key)) return { outsideKind: 'minorDominant' as const, target: null };

  const isMajorKey = !key.endsWith('m');
  const isBorrowed = isMajorKey
    ? (chord.quality === 'major' && BORROWED_IN_MAJOR.includes(distance)) ||
      (chord.quality === 'minor' && distance === PERFECT_FOURTH)
    : chord.quality === 'major' && distance === PERFECT_FOURTH;
  if (isBorrowed) return { outsideKind: 'borrowed' as const, target: null };

  const pitch = (NOTE_TO_SEMITONE[chord.root] + PERFECT_FOURTH) % 12;
  const targetDegree = chordToRomanNumeral(
    { raw: '', root: CHROMATIC[pitch], quality: 'power', extension: '', bass: null },
    key
  );
  if (chord.quality === 'major' && targetDegree.isDiatonic) {
    const isSeventhDegree = targetDegree.degree === 7;
    if (!isSeventhDegree) {
      return { outsideKind: 'secondaryDominant' as const, target: targetDegree.numeral };
    }
  }
  return { outsideKind: 'chromatic' as const, target: null };
}

function toDegree(chord: ParsedChord, key: string): HarmonyDegree {
  const { numeral, isDiatonic } = chordToRomanNumeral(chord, key);
  const base = { chord: chord.raw, numeral };
  if (isDiatonic) return { ...base, isDiatonic, outsideKind: null, target: null };
  return { ...base, isDiatonic, ...classifyOutside(chord, key) };
}

export function analyzeHarmony(song: {
  chords: string | null | undefined;
  lyricsWithChords: string | null | undefined;
  storedKey: string | null | undefined;
  capoFret: number | null | undefined;
}): HarmonyAnalysis | null {
  const sequence = extractChordSequence(song.lyricsWithChords);
  const hasOrder = sequence.length >= MIN_SEQUENCE;
  const chords = hasOrder ? sequence : parseChordsColumn(song.chords);
  if (chords.length === 0) return null;

  const capo = song.capoFret ?? 0;
  const resolved = resolveKey(chords, song.storedKey ?? null, capo);
  if (!resolved) return null;

  const distinct = [...new Map(chords.map((c) => [c.raw, c])).values()];
  const numerals = chords.map((chord) => chordToRomanNumeral(chord, resolved.key).numeral);

  return {
    ...resolved,
    soundingKey: capo > 0 ? transposeKey(resolved.key, capo) : null,
    degrees: distinct.map((chord) => toDegree(chord, resolved.key)),
    archetypes: hasOrder ? detectArchetypes(numerals) : [],
  };
}
