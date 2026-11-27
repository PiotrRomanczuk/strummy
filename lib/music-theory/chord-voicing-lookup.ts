import { chordShape, englishChordName } from './chord-shape';
import { CHORD_VOICINGS, type ChordVoicing } from './chord-voicings';
import { NOTE_TO_SEMITONE } from './chromatic';

/**
 * The one way to find the diagram for a chord a song names (#1240): the song
 * page, the song card, the song form and the student's chord chart all ask
 * here, so a chord drawn in one place is drawn in all of them.
 *
 * In order: the chord as written ("F#7", "D/F#"), its enharmonic spelling
 * ("Gb" → F#, "A#m" → Bbm), the chord without its slash bass ("Am7/G" → Am7),
 * and last its triad, the shape a student plays it with ("Em9" → Em,
 * "A7sus4" → A) — the same folding `chordShape` uses for the chord map. A
 * half-diminished chord does not fold: m7b5 is not a minor triad.
 */

const SPELLINGS: ReadonlyArray<ReadonlyArray<string>> = [
  ['C', 'B#'],
  ['C#', 'Db'],
  ['D'],
  ['D#', 'Eb'],
  ['E', 'Fb'],
  ['F', 'E#'],
  ['F#', 'Gb'],
  ['G'],
  ['G#', 'Ab'],
  ['A'],
  ['A#', 'Bb'],
  ['B', 'Cb'],
];

const ROOT = /^([A-G])([#b]?)/;
const NO_TRIAD_FOLD = /b5|ø/;

const byName = new Map(CHORD_VOICINGS.map((voicing) => [voicing.name, voicing]));

/** "F♯" → "F#", "B♭m" → "Bbm", "CM7" → "Cmaj7", "Asus" → "Asus4", "fis" → "F#m". */
const normalise = (symbol: string): string =>
  englishChordName(symbol.trim().replace(/♯/g, '#').replace(/♭/g, 'b'))
    .replace(/^([A-G][#b]?)(?:M7|Maj7|Δ7?)(?=$|\/)/, '$1maj7')
    .replace(/^([A-G][#b]?)min(?=$|\d|\/)/, '$1m')
    .replace(/^([A-G][#b]?(?:7)?)sus(?=$|\/)/, '$1sus4');

/** The voicing for this exact name under any spelling of its root. */
const exact = (name: string): ChordVoicing | undefined => {
  const match = name.match(ROOT);
  if (!match) return undefined;
  const pitch = NOTE_TO_SEMITONE[`${match[1]}${match[2]}`];
  if (pitch === undefined) return byName.get(name);
  const rest = name.slice(match[0].length);
  for (const root of SPELLINGS[pitch]) {
    const voicing = byName.get(`${root}${rest}`);
    if (voicing) return voicing;
  }
  return undefined;
};

/** The diagram for a chord symbol as songs write it, or undefined when there is none. */
export function voicingForChord(symbol: string): ChordVoicing | undefined {
  const name = normalise(symbol);
  if (!name) return undefined;
  const withoutBass = name.replace(/\/[A-G][#b]?$/, '');
  const found = exact(name) ?? exact(withoutBass);
  if (found || NO_TRIAD_FOLD.test(name)) return found;
  const triad = chordShape(name);
  return triad ? exact(triad) : undefined;
}
