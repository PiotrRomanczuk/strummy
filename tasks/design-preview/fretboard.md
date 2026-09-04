---
created: 2026-06-08
updated: 2026-09-02
status: done
slug: fretboard
---

# Fretboard Explorer

`/design-preview/fretboard`

## Status

**done — shipped into the product route, not a preview route.**

The design was ported straight onto `/dashboard/fretboard` (the live tool)
rather than mounted as a `/design-preview/` artboard: the route already
existed with an earlier, simpler board, so a second copy would have been the
duplicate-implementation trap `.claude/rules/structure.md` exists to prevent.

## Files on disk

- `components/fretboard/FretboardSVG.tsx` (+ `.Neck`, `.Markers`) — the SVG neck,
  open-string column, nut, inlays, CAGED zones, note markers, all three styles
- `components/fretboard/MiniCAGED.tsx` — CAGED position thumbnails
- `components/fretboard/Fretboard.tsx` (+ `.Header`, `.Board`, `.Controls`,
  `.Selectors`, `.Playback`, `.InfoPanel`, `.Insights`, `.Primitives`)
- `components/fretboard/useFretboardExplorer.ts`, `useFretboardPlayback.ts`,
  `fretboard-audio.helpers.ts`, `fretboard.constants.ts`, `fretboard.helpers.ts`
- `lib/music-theory/caged.ts`, `lib/music-theory/diatonic.ts`

Mobile is the same tree, not a second component: the layout stacks (board
first), the neck scrolls sideways, and the rotate hint appears below 860px.

## Source files (bundle)

Three closely-related files — read in this order (they now live in the repo at
`.claude/designs/strummy-design-bundle/project/src/`, not `/tmp`):

- `fretboard-theory.jsx` — scale + key data, note math
- `fretboard-svg.jsx` — SVG rendering primitives (the three runtime styles: `studio`, `engraved`, `mono`)
- `fretboard-explorer.jsx` — `<FretboardExplorer fretboardStyle>` and `<FretboardExplorerMobile fretboardStyle>`

## Artboards to mount

| Label                                | Dim       | Prototype                                              |
| ------------------------------------ | --------- | ------------------------------------------------------ |
| Desktop · 3-column · Editorial Light | 1440×1024 | `<FretboardExplorer fretboardStyle="engraved"/>`       |
| Mobile · Stacked · Landscape hint    | 390×844   | `<FretboardExplorerMobile fretboardStyle="engraved"/>` |

## Done

- [x] Theory: `lib/music-theory` gained `caged.ts` and `diatonic.ts` (the rest —
      notes, intervals, scales, chords, step formula — already existed)
- [x] SVG renderer with all three styles, switchable from the header and the URL
- [x] Explorer: key grid, mode switch, scale quick-picks + dropdown, chord grid,
      CAGED selector, display toggles, playback
- [x] Mobile: same tree, stacked with the board first and a scrolling neck
- [x] Interactive state in `'use client'`, mirrored to the URL (`key`, `mode`,
      `scale`/`chord`, `caged`, `style`) and shown in a Shareable-link card
- [x] Lint / typecheck clean; unit + component + E2E coverage updated

## Deviations from the sketch

- **Real audio.** The sketch's playback was a visual simulation with a
  no-op mute button; the port adds a small WebAudio pluck so "tap a note to
  hear it" is true (`fretboard-audio.helpers.ts`).
- **No separate intervals pill row** in the info rail: each note chip already
  carries its interval, and the Formula block prints the interval list.
- **No "Save preset" button** — there is no preset store to save to. Copy link
  covers the same need.
- **Diatonic roman numerals are derived** from the chord quality rather than
  the sketch's fixed `I ii iii…` strings, which mislabelled minor keys.
- **CAGED shapes that would start below the nut move up an octave** instead of
  being clamped into a two-fret stub.
