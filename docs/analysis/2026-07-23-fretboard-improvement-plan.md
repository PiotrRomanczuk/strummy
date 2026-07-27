# Fretboard feature: backend trust fix + UI rebuild — implementation plan

**Date**: 2026-07-23
**Author**: Claude (plan approved by Piotr, not yet implemented)
**Scope**: Two PRs — PR 1 `fix/chord-quiz-server-scoring` (server-authoritative quiz scoring + DB-rebuild "Phase 7 lite"), PR 2 `feature/fretboard-svg-rebuild` (core SVG rebuild of `/dashboard/fretboard` toward the batch-02 mockup)
**Status**: planned — not started

## Context

The fretboard explorer (`/dashboard/fretboard`) is a client-only CSS-grid of buttons at ~35% fidelity vs the batch-02 mockup, styled 100% inline (violating the `ed-*` editorial rule), with a11y gaps. Its surrounding backend (chord quiz/SRS — the only server logic in this domain) has real trust and schema problems:

- **Quiz correctness is client-decided and forgeable at the DB boundary**: `chord_quiz_attempts` has a student INSERT policy and `student_complete_chord_drill(p_score, p_total)` is EXECUTE-granted to `authenticated` — a student can forge a perfect teacher-assigned drill score via PostgREST directly, bypassing any server action.
- **Migration drift**: `chord_quiz_attempts`/`chord_srs` exist only in the baseline + archive, not the rebuilt `supabase/migrations/` chain (DB-rebuild Phase 7 unstarted). `chord_id` is free text with no catalog/FK.
- `lib/music-theory/srs.ts` (SM-2) has zero tests; the domain is absent from `types/database.types.ts` (masked because `lib/supabase/server.ts` omits the `<Database>` generic); `chord_srs` UPDATE policy lacks WITH CHECK; both tables GRANT ALL to anon.

Agreed scope: **PR 1** = server-authoritative scoring + schema port ("Phase 7 lite"), **PR 2** = core SVG rebuild of the fretboard UI (audio/CAGED/skins/presets deferred). Two branches off `main`, PR 1 merges first.

**Before starting**: commit or stash the in-flight `chore/canonical-domain-vercel` changes (README.md, docs) on that branch — PR 2 edits README.md. Mark WIP in the vault (`projects/Strummy/Strummy.md`).

---

## PR 1 — `fix/chord-quiz-server-scoring`

### Trust-boundary design

- **D1**: New `chords` catalog table; `id text pk` = voicing id (`'C-open'`), `display_name` = correct answer (`'C'`). Correctness = `selected_answer = chords.display_name`, derived in the DB.
- **D2**: One SECURITY DEFINER RPC `submit_chord_quiz_session(p_attempts jsonb, p_mode text default 'free', p_drill_assignment_id uuid default null) returns jsonb` — validates shape (1–50 attempts, field bounds), derives `is_correct`, inserts attempts, stamps the drill result inline (ownership / chord_drill present / not-cancelled checks copied from `student_complete_chord_drill`), all one transaction. Returns `{inserted, correct, total, results:[{chord_id,is_correct}]}` **in input order** (`with ordinality`).
- **D3**: Client stops sending `is_correct` (dropped from `ChordQuizAttemptInputSchema`); keeps local correctness only for instant per-question feedback; summary uses server counts.
- **D4**: SRS stays in the TS action (`updateChordSRSBatch`) — pacing data, no trust value; but is now fed from the RPC's returned verdicts, not client claims. Fix RLS while porting: UPDATE gets WITH CHECK; anon grants revoked; no DELETE policies (intentional, document).
- **D5**: `student_complete_chord_drill` folded into the new RPC; DROPped at cutover (only caller is the action).
- **D6**: Student INSERT policy on `chord_quiz_attempts` removed + insert revoked at cutover.
- **D7**: Add `mode text not null default 'free' check (in ('free','review','drill'))` to attempts (blueprint CHT-1 wants it; cheap now). RPC forces `'drill'` when drill id present.
- **D8 — zero-downtime**: migrations A+B additive (old deployed code keeps working); **C is breaking, applied only after prod deploys the new code**.

### Migrations (idempotent/reconciling — tables are LIVE in prod+dev from old lineage)

- **A `20260724090000_chords_catalog.sql`**: create-if-not-exists `chords` (id, display_name, difficulty `difficulty_level` default beginner, fingering jsonb, category, sort_order, timestamps + `set_updated_at`); seed 30 rows generated from `CHORD_VOICINGS` (`on conflict (id) do update`; one-off local script prints the INSERT block — the migration file is the committed source of truth); RLS SELECT-only to authenticated, nothing to anon.
- **B `20260724090100_chord_tables_port_and_rpc.sql`**: create-if-not-exists both tables per baseline defs (`supabase/baseline/cloud_schema_2026-06-22.sql` ~L2762–2789); add `mode`; constraints via DO-block guards (no `ADD CONSTRAINT IF NOT EXISTS` in PG): student FKs, `uq_chord_srs`, **new `chord_id → chords(id)` FK on both**; indexes if-not-exists; drop-policy-if-exists → recreate all policies (attempts INSERT kept until C; srs UPDATE gains WITH CHECK); staff-read policies use the rebuilt chain's helpers (`is_admin()`/`is_teacher()` from `20260718090000_foundation.sql` — baseline's `is_admin_or_teacher()` may not exist); revoke anon; the new RPC + grant + COMMENT (house style: `20260722000001_assignment_chord_drills.sql`).
- **C `20260724090200_chord_quiz_write_path_cutover.sql`**: drop attempts INSERT policy, revoke insert, drop old RPC.
- **Gate** `supabase/tests/phase7.sql` (wave0.sql style): catalog ≥30 rows; FK rejects unknown chord_id; uq enforced; RPC exists; anon zero grants; post-C: INSERT policy absent, old RPC gone.

### App changes

- `schemas/ChordQuizAttemptSchema.ts` — remove `is_correct` from input.
- `app/actions/chord-quiz.ts` — single `rpc('submit_chord_quiz_session', …)`; SRS batch from returned verdicts (zip by index); keep test-account guard, UUID check, revalidatePaths; add `mode` param.
- `components/skills/ChordQuiz/ChordQuiz.tsx` + `useChordQuiz.ts` — payload without `is_correct`; pass mode; summary prefers server `correct`.
- `schemas/AssignmentSchema.ts` — `ChordDrillSchema.chord_ids` refined against `CHORD_VOICINGS` ids (teacher-authoring gap).
- `lib/supabase/server.ts` — add `<Database>` generic, **separate commit** (Risk 1); `types/database.types.ts` regenerated from dev stack.

### Tests

- NEW `lib/music-theory/__tests__/srs.test.ts` — SM-2: wrong→reset/ease−0.2 floor 1.3; right→1→6→round(interval×ease); injectable `nowMs`.
- NEW seed-drift guard: migration A contains every `CHORD_VOICINGS` id+display_name, no extras.
- NEW `__tests__/app/actions/chord-quiz.test.ts` — RPC payload, SRS fed by server results, error paths.
- NEW `lib/testing/rls/__tests__/chord-quiz.rls.test.ts` (template: `assignment-checklist.rls.test.ts`, dev stack via `lib/testing/rls/env.ts`) — forged INSERT rejected; wrong answer → is_correct=false regardless of client; input-order preserved; drill stamps own assignment only; cross-student srs UPDATE blocked; staff read; anon nothing.
- Run existing `tests/e2e/student/chord-quiz-srs.spec.ts` unchanged (payload change invisible to E2E).

### Verification runbook

1. Orphan pre-flight on each stack: `chord_id`s in either table missing from catalog → placeholder catalog rows (never delete history).
2. Apply A/B/C on uwh dev: `docker exec -i supabase_db_StudentDevelopment psql -U postgres -d postgres < <file>`; also run chain against a scratch fresh DB (reconciling DDL must work in both states).
3. `psql -f supabase/tests/phase7.sql`; regen types (`supabase gen types --db-url postgresql://postgres:…@192.168.1.75:55322/postgres`); `npx tsc --noEmit` to size the generic-flip fallout.
4. `npm run lint && npm test && npm run test:integration` (RLS env → dev stack).
5. Manual: quiz on dev writes server-derived rows + mode; forged PostgREST insert with student JWT → 42501. Manual-test HTML `docs/manual-tests/<date>-chord-quiz-server-scoring.html` before commit.
6. Rollout: merge → preview verify → apply A+B to prod stack → merge production + deploy → apply C → re-verify quiz + forgery rejection.

### Docs

`docs/app-blueprint/05-chords-theory.md`: data-model update (catalog/mode/RPC), resolve chord_id open question, **delete the stale CHT-2 brief** + roadmap row (Shipped note); test-plan section updated.

---

## PR 2 — `feature/fretboard-svg-rebuild`

### lib/music-theory

- **Delete `chromatic.ts`** — fold `NOTE_TO_SEMITONE`/`semitoneDistance` into `notes.ts`, scale-interval consts into `scales.ts`; keep barrel surface identical (`CHROMATIC_SCALE` alias); fix `roman-numeral.ts` import. Add `normalizeNoteName()` to `notes.ts`; `fretboard.helpers.ts` drops its private `FLAT_TO_SHARP` (kills the third enharmonic map).
- NEW `diatonic.ts` (~80 L): `getDiatonicChords(root, scaleKey)` → 7 `{degree, note, roman, quality}` by stacked thirds; `[]` for non-heptatonic.
- `scales.ts`: `getScaleStepFormula(scaleKey)` → `W-W-H-…` with wrap (pentatonic_minor → `W½-W-W-W½-W`).

### Components — new `components/fretboard/explorer/`, delete `editorial/` same PR

Shell `FretboardExplorer.tsx` (~110) + `Controls` (~160: key grid, mode chips w/ aria-pressed, scale quick-buttons above full select, toggle hint lines) + `ChordGrid` (~70: 4×3 mono symbol chips) + `Board` (~90: tuning line "STANDARD · E-A-D-G-B-e", overflow-x:auto mobile scroll, note-count + step-formula line, tapped caption) + `svg/FretboardSVG.tsx` (~110) with `Neck` (~100: nut, fret wires, strings strokeWidth [0.8,1.0,1.3,1.6,2.0,2.4], inlays 3/5/7/9/15 + double 12, fret numbers) and `Markers` (~140: frets 0–15 incl. open column; cells `<g role="button" tabIndex aria-label="A — string 1, fret 5">`; root larger; non-scale dim dots) + `InfoRail` (~150: formula card, interval pills, note chips, copy-link card, "Quiz me on this scale" CTA → `/dashboard/skills/chord-quiz`) + `DiatonicStrip` (~80) + `useFretboardExplorer.ts` (~140: URL sync extended to ALL fields, `shareUrl`) + `fretboard.geometry.ts` (~90: `x(n)=W·(1−2^(−n/12))/(1−2^(−F/12))`, string y, radii) + `fretboard.helpers.ts` (~120: FRET_COUNT→15 via `TOTAL_FRETS`, `DISPLAY_STRINGS = [...STANDARD_TUNING].reverse()`, annotate frets 0–15, row 0 = high e). Delete `fretboard.styles.ts`.

A11y: aria-labels with note+string+fret; hidden cells keep `data-hidden` but lose role/tabIndex/pointer-events (`visibility:hidden`) — no focusable invisible cells; all chip buttons get `aria-pressed`.

### Styling

New `.ed-fb-*` block (~80 lines) in `app/editorial-tokens.css` — layout grid w/ ≤900px stack (replaces injected `<style>` tag), chips/toggles with `:hover/:focus-visible/[aria-pressed]`, board card, roman tiles, copy card. All colors via tokens (no `#fff`, no hardcoded rgba); SVG strokes/fills via CSS vars.

### Misc

- `app/dashboard/fretboard/page.tsx`: swap to FretboardExplorer (auth gate unchanged).
- **Remove unused `tone` dep** from package.json (audio deferred; re-add when it ships).
- **README.md ~L187–199**: rewrite to describe the real feature; delete CAGED/audio/positions claims + nonexistent file paths.
- Deferred (note in PR body): Tone.js audio/BPM, CAGED, board skins, save-preset, bottom sheet/tab bar, song-context chip.

### Tests

- Unit: `diatonic.test.ts` (C major → C Dm Em F G Am B°; a-minor; pentatonic → []); step formula; `fretboard.geometry.test.ts` (monotonic narrowing); helpers (open column, 16 cols, derived tuning).
- RTL: `FretboardExplorer.test.tsx` replaces the editorial test (~10 tests: 96 cells, root moves, aria-pressed, quick buttons, no focusable hidden cells, clipboard mock, diatonic strip).
- E2E `tests/e2e/teacher/fretboard.spec.ts` — deliberate contract update in-PR: 72→96 cells (6×16), keep `fb-cell-{row}-{fret}` + data attrs (row 0 = high e so e.g. `fb-cell-0-5`=A survives), hide-nonscale asserts `data-hidden`, add open-column/quick-button/diatonic/copy checks. Run per the local E2E runbook.
- Manual-test HTML `docs/manual-tests/<date>-fretboard-svg-rebuild.html` before commit.

---

## Risks

1. **`<Database>` flip on server.ts** — may surface errors across all domains. Mitigation: regen types + `tsc --noEmit` first as own commit; if unrelated fallout >~30 errors, drop the flip from PR 1 (keep regenerated types, type the RPC call locally) and file follow-up.
2. **Live-table reconciliation** — test migration B on dev stack (tables exist) AND scratch fresh DB (they don't).
3. **Orphan chord_ids vs new FK** — pre-flight query; placeholder rows, never delete history.
4. **Cutover window** — old prod code + migration C = broken quiz. Order: A+B → prod deploy → C.
5. **RPC result ordering** — SRS zip depends on input order; `with ordinality` + integration test.

## Quality gates (each commit)

`npm run lint && npm test` (+ `npm run test:integration` where touched); files <150 LOC (components <200), no `any`; manual-test HTML per PR; vault check-off after each merge.
