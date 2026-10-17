import {
  DEFAULT_ELEMENTS,
  DEFAULT_STRUM_PATTERN,
  DEFAULT_TAB_DISPLAY,
  DEFAULT_VARIATION,
  type ChordChunk,
  type ChordMarker,
  type ChordVoicing,
  type ElementToggles,
  type StrumStep,
  TAB_LENGTHS,
  type TabColumn,
  type TabDisplay,
  type TabPosition,
  type TabSize,
  type VariationId,
} from "../types";

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function asChunk(v: unknown): ChordChunk | null {
  if (!isObject(v)) return null;
  const chord = asString(v.chord);
  if (!chord) return null;
  return { chord, lyric: asString(v.lyric) };
}

export function asVoicing(v: unknown): ChordVoicing | null {
  if (!isObject(v)) return null;
  const name = asString(v.name);
  const base = asNumber(v.base) ?? 0;
  const frets = Array.isArray(v.frets) ? v.frets.filter((n): n is number => typeof n === "number") : [];
  const fingers = Array.isArray(v.fingers) ? v.fingers.filter((n): n is number => typeof n === "number") : [];
  if (!name || frets.length !== 6 || fingers.length !== 6) return null;
  return { name, base, frets, fingers };
}

function asTabColumn(v: unknown): TabColumn | null {
  if (!Array.isArray(v) || v.length !== 6) return null;
  return v.map((n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null));
}

export function asTab(v: unknown): TabColumn[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const cols = v.map(asTabColumn).filter((c): c is TabColumn => c !== null);
  return (TAB_LENGTHS as readonly number[]).includes(cols.length) ? cols : undefined;
}

// Migrate legacy markers: { id, chunkIdx, time, chordOverride? } → resolve
// chord/lyric from chunks at read time, then drop chunkIdx forever.
export function asMarker(v: unknown, chunks: ChordChunk[]): ChordMarker | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const time = asNumber(v.time);
  if (!id || time === undefined) return null;

  let chord = asString(v.chord);
  let lyric = typeof v.lyric === "string" ? v.lyric : undefined;
  if (!chord) {
    const idx = asNumber(v.chunkIdx);
    if (idx === undefined) return null;
    const chunk = chunks[idx];
    if (!chunk) return null;
    chord = typeof v.chordOverride === "string" && v.chordOverride.trim()
      ? v.chordOverride.trim()
      : chunk.chord;
    lyric = chunk.lyric || undefined;
  }
  if (!chord) return null;

  const out: ChordMarker = { id, time, chord };
  if (lyric) out.lyric = lyric;
  const tab = asTab(v.tab);
  if (tab) out.tab = tab;
  return out;
}

export function asVariation(v: unknown): VariationId {
  return v === "notebook" || v === "chyron" || v === "clean" ? v : DEFAULT_VARIATION;
}

export function asStrum(v: unknown): StrumStep[] {
  if (!Array.isArray(v)) return [...DEFAULT_STRUM_PATTERN];
  const filtered = v.filter((s): s is StrumStep => s === "D" || s === "U" || s === "-");
  return filtered.length ? filtered : [...DEFAULT_STRUM_PATTERN];
}

const TAB_SIZES: readonly TabSize[] = ["sm", "md", "lg"];
const TAB_POSITIONS: readonly TabPosition[] = ["inline", "below", "top-right", "bottom-left", "lyrics-strip", "strip"];

export function asTabDisplay(v: unknown): TabDisplay {
  if (!isObject(v)) return { ...DEFAULT_TAB_DISPLAY };
  const size = TAB_SIZES.includes(v.size as TabSize) ? (v.size as TabSize) : DEFAULT_TAB_DISPLAY.size;
  const position = TAB_POSITIONS.includes(v.position as TabPosition)
    ? (v.position as TabPosition)
    : DEFAULT_TAB_DISPLAY.position;
  const lookahead = typeof v.lookahead === "boolean" ? v.lookahead : DEFAULT_TAB_DISPLAY.lookahead;
  return { size, position, lookahead };
}

export function asElements(v: unknown): ElementToggles {
  if (!isObject(v)) return { ...DEFAULT_ELEMENTS };
  return {
    strum: typeof v.strum === "boolean" ? v.strum : DEFAULT_ELEMENTS.strum,
    next: typeof v.next === "boolean" ? v.next : DEFAULT_ELEMENTS.next,
    watermark: typeof v.watermark === "boolean" ? v.watermark : DEFAULT_ELEMENTS.watermark,
    meta: typeof v.meta === "boolean" ? v.meta : DEFAULT_ELEMENTS.meta,
    lyrics: typeof v.lyrics === "boolean" ? v.lyrics : DEFAULT_ELEMENTS.lyrics,
    tab: typeof v.tab === "boolean" ? v.tab : DEFAULT_ELEMENTS.tab,
  };
}
