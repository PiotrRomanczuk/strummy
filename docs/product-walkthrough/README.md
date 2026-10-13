---
created: 2026-10-13
updated: 2026-10-13
---

# Product walkthrough — „Strummy · Przewodnik po ekranach”

A Polish, A4, screen-by-screen document modelled on the Softfruit.farm
"dokumentacja dla sprzedaży" format: every screen gets a phone shot and three
blocks — **Co widać · Po co · Dla sprzedaży** — plus an honest **Uwaga** where a
gap is visible. The markdown-free source of truth is the TypeScript content
under `content/`; the HTML and PDF are generated.

| Path                                                   | What                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `content/NN-*.ts`                                      | One chapter per file; `index.ts` orders them and holds the cover text |
| `shots/*.jpg`                                          | Captured screens, written as JPEG by the spec (committed)             |
| `2026-10-13-strummy-przewodnik-po-ekranach.{html,pdf}` | Generated output — do not edit by hand                                |

## Refresh

```bash
# 1. Fresh demo data on the dev stack (dates relative to today; writes to the DB behind NEXT_PUBLIC_SUPABASE_URL — check it is :55321)
npm run seed:demo -- --yes

# 2. Screens (Playwright starts `npm run dev` itself; ~5 min for all 75 shots)
npx playwright test tests/e2e/manual/product-walkthrough.spec.ts --project="Desktop Chrome"
#    subset:  WALKTHROUGH_ONLY=t-home,s-home npx playwright test tests/e2e/manual/product-walkthrough.spec.ts --project="Desktop Chrome"

# 3. Document (any OS — no image converter needed)
npx tsx scripts/docs/walkthrough/build.ts            # html + pdf
npx tsx scripts/docs/walkthrough/build.ts --no-pdf   # html only
```

Demo accounts must have `profiles.locale = 'pl'` for Polish screens (the
profile preference beats the cookie); the seed does not set it.

## Adding a screen

1. Add a `Shot` to `tests/e2e/manual/product-walkthrough.shots.ts` (id = filename).
2. Capture it (`WALKTHROUGH_ONLY=<id>`), look at the JPEG.
3. Reference it from a chapter in `content/` with `see` / `why` written from what the shot actually shows.
4. Rebuild. Bump the date in `OUTPUT_BASENAME` and the cover kicker when publishing a new edition.
