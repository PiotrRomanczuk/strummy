import type { ChordVoicing } from './chord-voicings';
import { CHROMATIC_NOTES, type NoteName } from './notes';

/**
 * Voicings added for the chords teachers actually write in songs (#1240): the
 * barre majors and minors on every root, the barre sevenths, the open shapes
 * the song page used to keep in a table of its own, and a power chord on every
 * root. Written compactly — frets low E → high e, "x" muted — and expanded into
 * the same `ChordVoicing` the hand-written open chords use.
 */

type Barre = ChordVoicing['barre'];

const parse = (row: string): Array<number | null> =>
  row.split('').map((cell) => (cell === 'x' ? null : Number(cell)));

/** 1 when the shape fits the first four frets; otherwise its lowest fretted note. */
const baseFretOf = (frets: ReadonlyArray<number | null>): number => {
  const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
  return Math.max(...fretted) <= 4 ? 1 : Math.min(...fretted);
};

const voicing = (
  id: string,
  name: string,
  [root, chordKey]: [NoteName, string],
  [frets, fingers]: [string, string],
  barre?: Barre
): ChordVoicing => {
  const fretList = parse(frets);
  return {
    id,
    name,
    root,
    chordKey,
    frets: fretList,
    fingers: parse(fingers),
    baseFret: baseFretOf(fretList),
    ...(barre ? { barre } : {}),
  };
};

const lowBarre = (fret: number): Barre => ({ fret, fromString: 0, toString: 5 });
const fifthBarre = (fret: number): Barre => ({ fret, fromString: 1, toString: 5 });

const BARRE_VOICINGS: ChordVoicing[] = [
  voicing('Fsharp-barre', 'F#', ['F#', 'major'], ['244322', '134211'], lowBarre(2)),
  voicing('Csharp-barre', 'C#', ['C#', 'major'], ['x46664', 'x12341'], fifthBarre(4)),
  voicing('Eb-barre', 'Eb', ['D#', 'major'], ['x68886', 'x12341'], fifthBarre(6)),
  voicing('Ab-barre', 'Ab', ['G#', 'major'], ['466544', '134211'], lowBarre(4)),
  voicing('Bb-barre', 'Bb', ['A#', 'major'], ['x13331', 'x12341'], fifthBarre(1)),
  voicing('Cm-barre', 'Cm', ['C', 'minor'], ['x35543', 'x13421'], fifthBarre(3)),
  voicing('Ebm-barre', 'Ebm', ['D#', 'minor'], ['x68876', 'x13421'], fifthBarre(6)),
  voicing('Fm-barre', 'Fm', ['F', 'minor'], ['133111', '134111'], lowBarre(1)),
  voicing('Gm-barre', 'Gm', ['G', 'minor'], ['355333', '134111'], lowBarre(3)),
  voicing('Bbm-barre', 'Bbm', ['A#', 'minor'], ['x13321', 'x13421'], fifthBarre(1)),
  voicing('F7-barre', 'F7', ['F', 'dominant7'], ['131211', '131211'], lowBarre(1)),
  voicing('Fsharp7-barre', 'F#7', ['F#', 'dominant7'], ['242322', '131211'], lowBarre(2)),
  voicing('Bb7-barre', 'Bb7', ['A#', 'dominant7'], ['x13131', 'x13141'], fifthBarre(1)),
  voicing('Bm7-barre', 'Bm7', ['B', 'minor7'], ['x24232', 'x13141'], fifthBarre(2)),
  voicing('Fsharpm7-barre', 'F#m7', ['F#', 'minor7'], ['242222', '131111'], lowBarre(2)),
];

const OPEN_VOICINGS: ChordVoicing[] = [
  voicing('Gmaj7-open', 'Gmaj7', ['G', 'major7'], ['320002', '320001']),
  voicing('Cadd9-open', 'Cadd9', ['C', 'add9'], ['x32033', 'x21034']),
  voicing('Asus4-open', 'Asus4', ['A', 'sus4'], ['x02230', 'x01230']),
  voicing('Dsus2-open', 'Dsus2', ['D', 'sus2'], ['xx0230', 'xx0130']),
  voicing('Esus4-open', 'Esus4', ['E', 'sus4'], ['022200', '023400']),
  voicing('D-over-Fsharp-open', 'D/F#', ['D', 'major'], ['200232', '100243']),
  voicing('G-over-B-open', 'G/B', ['G', 'major'], ['x20033', 'x10034']),
  voicing('C-over-G-open', 'C/G', ['C', 'major'], ['332010', '342010']),
];

/** The display spelling of each pitch: flats where songs write flats. */
const DISPLAY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A root-and-fifth shape on every root E5 and A5 (open, hand-written) do not cover. */
const powerVoicing = (pitch: number): ChordVoicing => {
  const onLowE = (pitch - 4 + 12) % 12;
  const isOnLowE = onLowE <= 4;
  const fret = isOnLowE ? onLowE : (pitch - 9 + 12) % 12;
  const frets = isOnLowE ? `${fret}${fret + 2}${fret + 2}xxx` : `x${fret}${fret + 2}${fret + 2}xx`;
  const fingers = isOnLowE ? '134xxx' : 'x134xx';
  const name = `${DISPLAY_NAMES[pitch]}5`;
  return voicing(
    `${name.replace('#', 'sharp')}-power`,
    name,
    [CHROMATIC_NOTES[pitch], 'power'],
    [frets, fingers]
  );
};

const POWER_VOICINGS: ChordVoicing[] = DISPLAY_NAMES.map((_, pitch) => pitch)
  .filter((pitch) => pitch !== 4 && pitch !== 9)
  .map(powerVoicing);

export const SONG_VOICINGS: ReadonlyArray<ChordVoicing> = [
  ...BARRE_VOICINGS,
  ...OPEN_VOICINGS,
  ...POWER_VOICINGS,
];
