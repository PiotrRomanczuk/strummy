import type { ChordVoicing } from "./types";

// Default open-position voicings. Used to seed per-song voicings whenever
// the parser encounters a chord name we know. Anything missing falls back
// to a placeholder so the diagram still renders.
export const DEFAULT_VOICINGS: Record<string, ChordVoicing> = {
  E:     { name: "E",     base: 1, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  Em:    { name: "Em",    base: 1, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  E7:    { name: "E7",    base: 1, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  A:     { name: "A",     base: 1, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Am:    { name: "Am",    base: 1, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  A7:    { name: "A7",    base: 1, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  D:     { name: "D",     base: 1, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  Dm:    { name: "Dm",    base: 1, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  D7:    { name: "D7",    base: 1, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  G:     { name: "G",     base: 1, frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  G7:    { name: "G7",    base: 1, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  C:     { name: "C",     base: 1, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  C7:    { name: "C7",    base: 1, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  Cadd9: { name: "Cadd9", base: 1, frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 3, 2, 0, 4, 0] },
  F:     { name: "F",     base: 1, frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  Fmaj7: { name: "Fmaj7", base: 1, frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  B:     { name: "B",     base: 2, frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1] },
  Bm:    { name: "Bm",    base: 2, frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1] },
  B7:    { name: "B7",    base: 1, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
};

// Last-resort empty diagram so the UI never crashes on unknown chords.
export function placeholderVoicing(name: string): ChordVoicing {
  return { name, base: 1, frets: [-1, -1, -1, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0] };
}

export function voicingFor(name: string): ChordVoicing {
  return DEFAULT_VOICINGS[name] ?? placeholderVoicing(name);
}
