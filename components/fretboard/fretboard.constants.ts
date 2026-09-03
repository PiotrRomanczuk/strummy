import type { NoteName } from '@/lib/music-theory';

/** The three neck finishes from the design: warm wood, editorial cream, minimal. */
export type FretboardStyle = 'studio' | 'engraved' | 'mono';

export const FRETBOARD_STYLES: { value: FretboardStyle; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'engraved', label: 'Engraved' },
  { value: 'mono', label: 'Mono' },
];

export interface FretboardStyleTokens {
  boardFill: string;
  boardStroke: string;
  fretWire: string;
  fretWireShadow: string;
  stringColor: string;
  nutFill: string;
  nutStroke: string;
  inlayFill: string;
  textDim: string;
  cagedBg: string;
  cagedStroke: string;
}

export const FB_STYLE_TOKENS: Record<FretboardStyle, FretboardStyleTokens> = {
  studio: {
    boardFill: 'url(#fb-wood)',
    boardStroke: 'var(--rule)',
    fretWire: '#bfae95',
    fretWireShadow: '#a39277',
    stringColor: '#6b5a43',
    nutFill: '#f8f3e8',
    nutStroke: '#a39277',
    inlayFill: '#b19a78',
    textDim: '#9d8f7a',
    cagedBg: 'rgba(200,149,35,0.10)',
    cagedStroke: 'rgba(177,127,18,0.35)',
  },
  engraved: {
    boardFill: 'var(--paper)',
    boardStroke: 'var(--rule)',
    fretWire: 'var(--ink-4)',
    fretWireShadow: 'var(--ink-5)',
    stringColor: 'var(--ink-3)',
    nutFill: 'var(--card)',
    nutStroke: 'var(--ink-2)',
    inlayFill: 'var(--ink-5)',
    textDim: 'var(--ink-4)',
    cagedBg: 'var(--gold-tint)',
    cagedStroke: 'var(--gold-dim)',
  },
  mono: {
    boardFill: 'var(--card)',
    boardStroke: 'var(--rule)',
    fretWire: 'var(--ink-5)',
    fretWireShadow: 'var(--ink-5)',
    stringColor: 'var(--ink-4)',
    nutFill: 'var(--ink-2)',
    nutStroke: 'var(--ink-2)',
    inlayFill: 'var(--ink-5)',
    textDim: 'var(--ink-4)',
    cagedBg: 'var(--rule-2)',
    cagedStroke: 'var(--rule)',
  },
};

/** Highest fret drawn. The board also carries an open-string column (fret 0). */
export const LAST_FRET = 15;

/** Strings top-to-bottom as drawn: high e (string 1) down to low E (string 6). */
export const DISPLAY_STRINGS: NoteName[] = ['E', 'B', 'G', 'D', 'A', 'E'];

/** Display labels for those strings — lowercase marks the thin high e. */
export const DISPLAY_STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

/** MIDI note numbers of the open strings, in display order (high e first). */
export const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];

/** String gauges in display order — the low E at the bottom is the thickest. */
export const STRING_THICKNESS = [0.8, 1.0, 1.3, 1.6, 2.0, 2.4];

export const INLAY_FRETS = [3, 5, 7, 9, 15];
export const DOUBLE_INLAY_FRET = 12;
export const FRET_NUMBER_MARKS = [1, 3, 5, 7, 9, 12, 15];

/** SVG geometry. The board keeps an intrinsic width and scrolls on mobile. */
export const BOARD_GEOMETRY = {
  minWidth: 720,
  maxWidth: 1040,
  height: 248,
  padTop: 28,
  padBottom: 24,
  padLeft: 14,
  padRight: 14,
  labelWidth: 24,
};
