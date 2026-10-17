import type { ChordChunk } from "./types";

// A chord token is a root letter (A-G), optional accidental (#/b), and an
// optional quality suffix (m, maj7, sus4, add9, /B, …). The /B bass slash
// gets eaten too so "G/B" parses as one chord, not two.
const CHORD_TOKEN = /^[A-G](?:#|b)?(?:maj|min|m|sus|add|dim|aug|°|\+)?\d*(?:\/[A-G](?:#|b)?)?$/;

function isChordToken(s: string): boolean {
  return CHORD_TOKEN.test(s.trim());
}

// "G/B" → "G/B"; strips brackets if present.
function normalizeChord(raw: string): string {
  return raw.replace(/[\[\]()]/g, "").trim();
}

// Inline form: "[Em]Hello [G]darkness my old [D]friend"
// Chunks split at each chord; lyric is everything until the next chord.
function parseInline(text: string): ChordChunk[] {
  const re = /\[([^\]]+)\]([^\[]*)/g;
  const chunks: ChordChunk[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const chord = normalizeChord(m[1]);
    if (!isChordToken(chord)) continue;
    chunks.push({ chord, lyric: (m[2] ?? "").replace(/\s+/g, " ").trim() });
  }
  return chunks;
}

// Two-line form (most UG sheets):
//   "       Em            G"
//   "Hello darkness my old friend"
// Build chunks by walking the chord line column-by-column and slicing the
// lyric line at each chord's column position.
function parseTwoLineBlock(chordLine: string, lyricLine: string): ChordChunk[] {
  const chords: { chord: string; col: number }[] = [];
  const tokenRe = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(chordLine)) !== null) {
    const tok = normalizeChord(m[0]);
    if (isChordToken(tok)) chords.push({ chord: tok, col: m.index });
  }
  if (chords.length === 0) return [];

  const chunks: ChordChunk[] = [];
  for (let i = 0; i < chords.length; i++) {
    const start = chords[i].col;
    const end = i + 1 < chords.length ? chords[i + 1].col : lyricLine.length;
    const slice = lyricLine.slice(start, end).replace(/\s+/g, " ").trim();
    chunks.push({ chord: chords[i].chord, lyric: slice });
  }
  return chunks;
}

// A line "looks like a chord line" when its non-whitespace tokens are mostly
// chord tokens. Loose threshold: ≥60% chord-shaped tokens, and at least one.
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordy = tokens.filter((t) => isChordToken(normalizeChord(t))).length;
  return chordy >= 1 && chordy / tokens.length >= 0.6;
}

// Section markers like "[Verse]" / "[Chorus]" / "[Intro]" — skip these so the
// inline-bracket parser doesn't mistake them for chords.
function isSectionMarker(line: string): boolean {
  const trimmed = line.trim();
  return /^\[[^\]]+\]$/.test(trimmed) && !isChordToken(normalizeChord(trimmed.slice(1, -1)));
}

export function parseChordSheet(input: string): ChordChunk[] {
  const text = input.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const chunks: ChordChunk[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSectionMarker(line)) continue;

    if (line.includes("[") && /\[[A-G][^\]]*\]/.test(line)) {
      // Inline-bracketed line: parse and continue.
      chunks.push(...parseInline(line));
      continue;
    }

    if (isChordLine(line)) {
      // Pair with next non-blank lyric line if present and not also a chord line.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const lyricLine = j < lines.length && !isChordLine(lines[j]) ? lines[j] : "";
      chunks.push(...parseTwoLineBlock(line, lyricLine));
      if (lyricLine) i = j; // consume the lyric line
    }
    // Plain prose (or empty) → ignore.
  }

  return collapseRepeats(chunks);
}

// If a chord repeats with no lyric in between (common in UG dumps), merge.
// Keeps the timeline clean — you don't want 12 markers for 12 strums of Em.
function collapseRepeats(chunks: ChordChunk[]): ChordChunk[] {
  const out: ChordChunk[] = [];
  for (const c of chunks) {
    const prev = out[out.length - 1];
    if (prev && prev.chord === c.chord && c.lyric === "") continue;
    out.push(c);
  }
  return out;
}

// Distinct chord names in first-appearance order. Used to seed per-song
// voicings without duplicates.
export function uniqueChords(chunks: ChordChunk[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chunks) {
    if (seen.has(c.chord)) continue;
    seen.add(c.chord);
    out.push(c.chord);
  }
  return out;
}
