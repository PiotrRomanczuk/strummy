---
created: 2026-10-17
updated: 2026-10-17
---

# @JustMeAndGuitars — TikTok content plan (merged into Strummy)

The JustMeAndGuitars project was merged into Strummy on 2026-10-17
(ADR: `docs/app-blueprint/adr/2026-10-17-0004-justmeandguitars-merged-into-strummy.md`).
JMG was always meant to be Strummy's content pipeline; this folder is now the
home of its plan.

| File                     | What                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `songs.yaml`             | The 60-entry song catalogue (title, artist, genre, ★ difficulty, status, priority, notes). **Source for the `songs` import** — see below. |
| `strategy.yaml`          | Posting strategy (cadence, hooks, goals).                                                                                                 |
| `content-model.md`       | Field-by-field description of the YAML content model (was `planning/content/README.md`).                                                  |
| `TODO.md`                | The JMG task list as of the merge.                                                                                                        |
| `jmg-planning-README.md` | The original planning repo README (paths in it refer to the old repo).                                                                    |
| `plans/`                 | The April 2026 marketing-plan spec and implementation plan.                                                                               |

The overlay renderer (chord overlays baked into videos with ffmpeg) lives in
`tools/chord-overlay/` — a standalone Next.js app with its own `package.json`,
excluded from Strummy's lint/typecheck/tests/build and from Vercel uploads.

## Importing the catalogue into `public.songs`

```bash
# dry run (default) — prints every planned insert/update
npx tsx scripts/database/seeding/import-jmg-songs.ts --target dev
# write to StudentDevelopment
npx tsx scripts/database/seeding/import-jmg-songs.ts --target dev --apply
```

Mapping: `artist` → `author`, ★ count → `level` (≤2 beginner, 3 intermediate,
≥4 advanced), `status` → `priority_bucket` (unknown status = hard error),
`genre` → `category`, `tiktok_short_url` stays NULL until a real video exists.
Shorthand titles ("Hotel Cali Solo") are expanded via
`scripts/database/seeding/import-jmg-songs.data.ts`. Production import
procedure: `docs/manual-tests/2026-10-17-jmg-merge.html`.

## Not carried over

The XLSX workbook, the Python `venv`, the openpyxl scripts, the other YAML
extracts (calendar, hashtags, stories, …) and the overlay asset uploads stay in
the archived repos:

- https://github.com/PiotrRomanczuk/justmeandguitars (planning)
- https://github.com/PiotrRomanczuk/justmeandguitars-overlay-app (overlay app — history preserved here via `git subtree`)
