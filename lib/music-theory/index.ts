export {
  CHROMATIC_NOTES,
  STANDARD_TUNING,
  TOTAL_FRETS,
  ENHARMONIC_MAP,
  getNoteAtFret,
  buildFretboard,
  getNoteIndex,
  noteFromIndex,
  formatNote,
  type NoteName,
  INTERVAL_NAMES,
  type IntervalName,
  getIntervalName,
  getSemitoneDistance,
} from './notes';

export {
  SCALE_DEFINITIONS,
  getScaleNotes,
  isNoteInScale,
  getNoteDegree,
  getScaleStepFormula,
  type ScaleDefinition,
} from './scales';

export {
  CHORD_DEFINITIONS,
  getChordNotes,
  isNoteInChord,
  getChordDisplayName,
  type ChordDefinition,
} from './chords';

export {
  CHROMATIC_NOTES as CHROMATIC_SCALE,
  NOTE_TO_SEMITONE,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  semitoneDistance,
} from './chromatic';

export { parseChord, parseChordsColumn, type ParsedChord } from './chord-parser';

export {
  chordToRomanNumeral,
  chordsToRomanNumerals,
  type RomanNumeralResult,
} from './roman-numeral';

export { detectArchetypes, ARCHETYPES, type ProgressionArchetype } from './progression-archetypes';
