---
status: accepted
created: 2026-10-17
---

# justmeandguitars merged into Strummy

**Date**: 2026-10-17
**Author**: Claude (executing Piotr's 2026-10-17 project-consolidation plan)
**Scope**: Where the @JustMeAndGuitars TikTok tooling, content plan and song catalogue live

## Context

On 2026-08-03 Piotr decided that JustMeAndGuitars (JMG) is "the content
pipeline for Strummy", but the code stayed in two separate repos:
`justmeandguitars` (planning: XLSX, YAML extracts, docs) and
`justmeandguitars-overlay-app` (Next.js renderer that bakes chord overlays into
videos with ffmpeg). Strummy already had the data model JMG needed —
`songs.tiktok_short_url`, `songs.priority_bucket`, `songs.level`,
`content_posts` — plus an XLSX importer (`import-content-plan.ts`) that nobody
ran because the workbook lived in the other repo. Meanwhile 15 dev songs
carried fake `@strummyapp` TikTok URLs from seeding.

## Decision

1. The overlay app moves to `tools/chord-overlay/` via `git subtree add`
   (history preserved). It stays a standalone app with its own
   `package.json`; Strummy's tsconfig, ESLint, Jest, Prettier, Tailwind source
   detection and `.vercelignore` all exclude `tools/`.
2. The content plan (`songs.yaml`, `strategy.yaml`, markdown docs) moves to
   `docs/marketing/tiktok/`. The XLSX, venv and openpyxl scripts stay in the
   archived repo.
3. The song catalogue is imported into `public.songs` with
   `scripts/database/seeding/import-jmg-songs.ts`: YAML is the source,
   dry-run by default, `--target dev|prod` required, guarded by URL **and**
   the Postgres cluster's `system_identifier`; prod additionally needs a
   pg_dump less than 6h old. Matching existing songs updates
   `priority_bucket` and only fills empty `level`/`category` (curated values
   win). Fake `@strummyapp` URLs are cleared.

## Considered Options

- **Keep JMG separate** — rejected: one product line in three repos, and the
  Strummy fields it feeds sat unused.
- **Fold the overlay into the Strummy app (a route under `app/`)** — rejected
  for now: it needs local ffmpeg and large uploads, neither of which fits a
  Vercel deployment. `tools/` keeps it runnable locally with zero impact on
  the production bundle; promoting it later is a separate decision.
- **Reuse `import-content-plan.ts` (XLSX)** — rejected: it needs the XLSX
  and `--remote` targets whatever `NEXT_PUBLIC_SUPABASE_URL` says, with no
  prod guard. Its status→bucket map and title/artist normalisers are reused.

## Consequences

- Strummy's root `npm run lint/typecheck/test/build` never see `tools/`; the
  overlay has to be checked with its own `npm` scripts inside that folder.
- The two JMG GitHub repos get archived with a README pointer here.
- Production import is a separate, manual step (fresh pg_dump first) —
  procedure in `docs/manual-tests/2026-10-17-jmg-merge.html`.
- Squash-merging the PR flattens the subtree history on `main`; the original
  history remains in the archived overlay repo.
