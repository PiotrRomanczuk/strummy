/**
 * Every distinct chord symbol the songs on the dev stack name, 2026-11-27 (#1240):
 * `songs.chords` split the way `chord-shape.ts` splits it, plus
 * `song_analyses.chords`. Chord symbols only — nothing else from the rows.
 * Refresh by re-reading both columns when the catalogue grows.
 */
export const SONG_CHORD_SYMBOLS: ReadonlyArray<string> = [
  'A', 'A#5', 'A#m', 'A/B', 'A/E', 'A5', 'A6', 'A7', 'A7sus4', 'Aadd9', 'Ab', 'Abm', 'Am',
  'Am/B', 'Am/C', 'Am/D', 'Am/E', 'Am/G', 'Am7', 'Am7/G', 'Am9', 'Amadd9', 'Amaj7', 'Ammaj7',
  'Asus', 'Asus2', 'Asus4', 'B', 'B5', 'B7', 'B7sus4', 'Badd11', 'Bb', 'Bb/A', 'Bb5', 'Bb6sus4',
  'Bb7', 'Bbm', 'Bbm6', 'Bm', 'Bm7', 'Bmadd4', 'C', 'C#', 'C#5', 'C#7', 'C#9', 'C#m', 'C#m/G#',
  'C#m7', 'C/B', 'C/D', 'C/E', 'C/G', 'C11sus2', 'C5', 'C6', 'C7', 'C7add9', 'CM7', 'Cadd9',
  'Cm', 'Cm7', 'Cmaj7', 'Csus2', 'D', 'D#', 'D#5', 'D#m', 'D#m7b5', 'D/A', 'D/B', 'D/C', 'D/E',
  'D/F#', 'D/G', 'D5', 'D6/9', 'D7', 'D7/F#', 'D7sus2', 'D7sus4', 'D9', 'Dadd9', 'Db', 'Dm',
  'Dm/F', 'Dm/G', 'Dm11', 'Dm7', 'Dm9', 'Dmaj7', 'Dsus2', 'Dsus4', 'E', 'E+', 'E/G#', 'E5', 'E6',
  'E7', 'E7#5', 'E7#9', 'E7sus4', 'Eadd9', 'Eb', 'Eb/G', 'Ebm', 'Em', 'Em/B', 'Em/C', 'Em/D',
  'Em7', 'Em7/D', 'Emadd9', 'Emaj7', 'Esus2', 'Esus4', 'F', 'F#', 'F#5', 'F#6', 'F#7', 'F#m',
  'F#m7', 'F/C', 'F5', 'F6', 'F7', 'Fadd#11', 'Fm', 'Fmaj7', 'Fmaj7b5', 'Fsus2', 'G', 'G#',
  'G#5', 'G#7', 'G#M', 'G#m', 'G#m7', 'G/A', 'G/B', 'G/D', 'G/F#', 'G5', 'G5/D', 'G5/F#', 'G6',
  'G7', 'G9', 'Gadd9', 'Gb', 'Gm', 'Gm7', 'Gsus', 'Gsus4', 'a', 'as', 'b', 'd', 'e', 'e/A', 'f',
  'fis', 'h',
];
