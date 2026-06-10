# /public/landing/ — photo assets

_2026-05-27_

The cinematic landing page sources its photos from this folder. Until real
photos are dropped in, every section falls back to **picsum.photos** placeholders
(deterministically seeded by slug). Replace each picsum URL in
`components/landing/data/collages.ts` with a real Unsplash photo using the
guidelines below.

## Photo specs

- Format: `.jpg`, q80, ≤ 2400px on the long edge
- Mood: warm natural light, earthy tones (the ivory/gold editorial palette)
- License: Unsplash (commercial OK) — record the source URL as a JSDoc comment
  in `data/collages.ts` next to each entry

## Required files

| Slug                           | Search term                                 | Used by                   |
| ------------------------------ | ------------------------------------------- | ------------------------- |
| `hero-teacher-couch.jpg`       | guitar teacher acoustic student living room | Hero (large, tilted -4°)  |
| `hero-laptop-laugh.jpg`        | two women laughing laptop couch             | Hero (mid, tilted +6°)    |
| `hero-fretboard-hands.jpg`     | hands fretboard close up acoustic           | Hero (small, tilted -8°)  |
| `texture-concrete.jpg`         | concrete sidewalk shadow texture seamless   | SubBand + FinalCTA bg     |
| `reality-spreadsheet.jpg`      | messy desk notebook coffee laptop           | Reality (left full-bleed) |
| `efficiency-planning.jpg`      | music teacher writing notebook              | Efficiency (large)        |
| `efficiency-student-smile.jpg` | young guitar student smiling lesson         | Efficiency (mid)          |
| `efficiency-sheet-music.jpg`   | handwritten tablature sheet music           | Efficiency (small)        |
| `workflow-monday.jpg`          | guitar lesson morning natural light         | Timeline Mon              |
| `workflow-wednesday.jpg`       | teen guitar student practice                | Timeline Wed              |
| `workflow-friday.jpg`          | guitarist solo evening warm light           | Timeline Fri              |
| `grain.png`                    | film grain transparent overlay 1024         | Global subtle overlay     |

## Logos (`/public/landing/logos/`)

Six grayscale SVG marks (real or fictional studio logos). The marquee
gracefully handles any count between 4 and 8.

## How the swap works

Each entry in `components/landing/data/collages.ts` has its `src` field pointing
at a `picsum.photos` seeded URL today (so the page renders immediately for
visual testing). To swap, drop the real file in this folder using the slug from
the table above, then replace the `src` in `collages.ts` with
`/landing/<slug>.jpg`. No other code change required.
