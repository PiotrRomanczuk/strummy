// Vertical fretboard, 6 strings: low E -> high E.
// fret: 0 = open, -1 = mute, >0 = fret number.
// finger: 0 = none, 1..4 = finger.
export interface ChordVoicing {
  name: string;
  base: number;
  frets: number[];
  fingers: number[];
}

// One sliced chunk of the chord sheet: a chord and the lyric word(s) it sits over.
export interface ChordChunk {
  chord: string;
  lyric: string;
}

// One stamped chord change in the video timeline. The marker stores the chord
// and (optionally) lyric directly so editing the chord sheet later doesn't
// silently rewrite history. The chord sheet is a *suggestion source* for new
// taps, not a foreign key.
export interface ChordMarker {
  id: string;
  time: number;
  chord: string;
  lyric?: string;
  // 8-column, 6-string TAB pattern aligned to sub-beats. Optional; rendered
  // only when set and elements.tab is on.
  tab?: TabColumn[];
}

// One column of the TAB grid: a fret number per string (low E…high e) or
// null when the string isn't picked on this sub-beat. Length is always 6.
export type TabColumn = (number | null)[];

// Allowed TAB lengths. 8 stays the default (matches the strum grid); 16
// covers 16th-note picking, 6/12 cover triplets/sextuplets.
export const TAB_LENGTHS = [4, 6, 8, 12, 16] as const;
export type TabLength = typeof TAB_LENGTHS[number];

export type VariationId = "clean" | "notebook" | "chyron";
export type StrumStep = "D" | "U" | "-";

// Visibility toggles for individual overlay elements. Defaults to all-on so
// existing projects keep their look.
export interface ElementToggles {
  strum: boolean;
  next: boolean;
  watermark: boolean;
  meta: boolean;
  lyrics: boolean;
  tab: boolean;
}

export const DEFAULT_ELEMENTS: ElementToggles = {
  strum: true,
  next: true,
  watermark: true,
  meta: true,
  lyrics: true,
  tab: false,
};

export const DEFAULT_STRUM_PATTERN: StrumStep[] = ["D", "-", "D", "U", "-", "U", "D", "U"];

// On-video TAB display preferences. Independent from the per-marker pattern —
// these affect how the row renders, not what notes are stored.
export type TabSize = "sm" | "md" | "lg";
export type TabPosition = "inline" | "below" | "top-right" | "bottom-left" | "lyrics-strip" | "strip";

export interface TabDisplay {
  size: TabSize;
  position: TabPosition;
  // When true, dim a preview of the next marker's tab next to the current one.
  lookahead: boolean;
}

export const DEFAULT_TAB_DISPLAY: TabDisplay = {
  size: "md",
  position: "inline",
  lookahead: false,
};

export interface Project {
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: {
    filename: string;
    durationSec?: number;
    width?: number;
    height?: number;
  };
  sheetText: string;
  chunks: ChordChunk[];
  voicings: Record<string, ChordVoicing>;
  markers: ChordMarker[];
  variation: VariationId;
  bpmDisplay?: number;
  capoDisplay?: number;
  watermark: string;
  strum: StrumStep[];
  elements: ElementToggles;
  tabDisplay: TabDisplay;
  baked?: {
    outputFilename: string;
    bakedAt: string;
  };
}

export const DEFAULT_VARIATION: VariationId = "clean";
export const DEFAULT_WATERMARK = "@justmeandguitars";
