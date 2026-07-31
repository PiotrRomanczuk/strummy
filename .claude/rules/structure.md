---
description: Structural rules — module layout, naming, layers, dead code, and the enforcement each rule ships with
globs: ['lib/**', 'components/**', 'app/**', 'hooks/**', 'schemas/**', 'types/**', 'scripts/**']
---

## Why this file exists

Every rule below is here because the failure it prevents **already happened in
this repo**, and was found during the 2026-07-30 cleanup. None of it is generic
advice. Each rule names the incident and the check that catches a recurrence.

The meta-rule, learned the hard way from this codebase's own docs:

> **A rule with no consequence is decoration.** `CLAUDE.md` claimed "tests live
> in `/__tests__`" while 90% were colocated. `code-style.md` called the 200-LOC
> limit "Enforced" while 53 files exceeded it. Both were followed by agents and
> widened the drift. If you add a rule here, add its check — or don't add it.

Run the checks: `npm run check:structure` (2s, read-only).

---

## S1 — A name is a file **or** a directory, never both

`lib/supabase.ts` sat beside `lib/supabase/`. The file wins module resolution,
so `lib/supabase/index.ts` was **unreachable** — and that unreachable barrel
exported a second `authenticateRequest` with a different signature from the live
one in `lib/auth/api-auth.ts`, plus it pulled `next/headers` into a path a client
component imported. `tsc` was silent: both files compiled fine.

**Do:** when a module grows into several files, move it to `dir/index.ts`. Every
existing `@/lib/<name>` import keeps resolving — 270 `@/lib/logger` imports
survived exactly this move untouched.

**Never:** leave `foo.ts` next to `foo/`, even when `foo/` has no `index.ts`
today. That is how the trap gets set.

**Enforced:** `C1`. Active shadowing (directory has an `index.ts`) is a **hard
failure**. A latent collision is a warning.

---

## S2 — A layer needs more than one module

`lib/queries/` held one file. `lib/repositories/` held one. `lib/mutations/`
held four hooks with **zero** consumers. Together they advertised a repository
architecture the codebase did not have — the real work had gone into
`lib/services/` (85 files, including several `*-queries.ts`). Three directories
describing an intention rather than a design.

**Do:** put the code where it is used. Create a directory when a _second_ real
module needs to live beside the first, not in anticipation.

**Never:** create a layer for one file. A directory is a claim about the
architecture; an empty claim is worse than no claim, because the next reader has
to discover it by reading rather than by looking.

**Enforced:** `C2` (direct children of `lib/`). `app/` is exempt — the App Router
_requires_ one directory per route.

---

## S3 — One exported name, one definition

Two `authenticateRequest` with incompatible signatures (`Request` vs a client).
Two `useAuth`. Two `Role`. Two `EmptyState`. Two `LoadingScreen`. In each case
one was live and one was dead, and nothing at the import site said which you
were getting.

**Do:** if two things genuinely need the same name, they belong to different
domains — scope them (`components/songs/primitives.tsx` beside
`components/lessons/primitives.tsx` is fine). Shared infrastructure gets one.

**Never:** duplicate a name in `lib/`. That is the coin-flip case.

**Enforced:** `C4` (exported _functions_ in `lib/`; a repeated type name in two
adjacent service files is usually harmless, a repeated function is the
substitutability trap).

---

## S4 — Generated files are generated

**Four** hand-maintained copies of the Supabase schema types existed at once —
`database.types.ts`, `types/database.types.ts`, `types/database.types.generated.ts`
and `types/supabase.ts`. None re-exported another; all four disagreed with the
schema and with each other. `tsc` trusted them, so selecting a dropped column
compiled cleanly and Postgres then rejected the ENTIRE query with 42703 — one
stale reference breaking a whole feature at runtime. At least seven production
bugs traced to it, including a completely broken invite flow.

**Do:** one generated file, one generator, one CI gate. `database.types.ts` at
the repo root is the only definition; the three `types/*` modules are deliberate
15-line re-exports so existing `@/types/...` imports keep resolving — **do not
add an independent definition to any of them.** `npm run db:types` regenerates
from the live dev schema; `npm run db:types:check` fails when the committed file
is stale.

**Never:** hand-edit a generated file. Never keep a second copy "just for now".

**Enforced:** the `types-drift` job in `e2e.yml` — deliberately **ungated**, so
it runs on every PR rather than waiting for someone to remember a label. It
lives there rather than `ci.yml` because it needs the dev database and
`ubuntu-latest` cannot reach the LAN.

---

## S5 — Deprecated means deleted or mounted, never maintained

`components/auth/AuthProvider.tsx` is marked deprecated in
`components/auth/index.ts`, its export is commented out, nothing mounts it, and
its `useAuth` has no consumers — **and it received a TIER 0 auth fix on
2026-07-30**. Effort went into code that does not run.

**Do:** when you find yourself fixing something unmounted, stop and decide. If
it is worth fixing, mount it. If not, delete it — git remembers.

**Never:** deprecate with a comment. A deprecation note without a removal commit
is a promise nobody scheduled.

**Enforced:** `C5` — modules with no importer that were edited in the last 60
days. It cannot prove intent, but "nobody imports this and somebody is still
editing it" is the exact signature.

---

## S6 — Version suffixes need an end date

`components/v2/` has run in parallel with the v1 tree for months: 50 files,
duplicating `AppShell`, `Header`, `StatusBadge` and `StepWizardForm`. A
version-numbered directory with no completion criterion is permanent by default.

**Do:** either finish the cutover and delete the predecessor, or rename the
directory for what it actually is (`mobile/`, `editorial/`). If a cutover is
genuinely in flight, the planner vault owns the task — the tree should not.

**Never:** ship `v2`, `new`, `old` or `legacy` as a lasting path segment.

**Enforced:** `C3` (`v[0-9]+`, `legacy`, `deprecated`). `app/` is exempt: `new`
and `edit` are CRUD route segments there, not version markers.

---

## S7 — One way to invoke a thing

13 `scripts/*.sh` wrappers existed whose entire body was `exec` into a
subdirectory. Every `package.json` script already called the real path, so the
wrappers served nothing but a second way to be right. Separately, ~30 of the 83
npm scripts were Playwright `--project` flags dressed as commands.

**Do:** `npm run <thing>` is the interface. Scripts live in
`scripts/<purpose>/` and are invoked by their real path.

**Never:** add a wrapper that only forwards. Never add a script that is just a
flag — document the flag.

**Enforced:** by review. (A checker here would have more false positives than
findings; this one is cheap to hold in your head.)

---

## S8 — Per-commit artifacts do not accrete in git

`docs/manual-tests/` reached 63 self-contained HTML reports in **13 days** —
read once each, then dead, and about 2 MB of the docs tree.

**Do:** keep producing them; the gate earns its keep. Prune on merge — the 63
were pruned to the current release window and the rest stay recoverable from
history.

**Never:** let them accumulate unbounded. 63 in 13 days is the signal that
nobody is pruning.

**Enforced:** by review, deliberately. Gitignoring the directory was tried and
reverted: reports are still actively committed (two landed on 2026-07-31), so
ignoring them would have made a maintainer's future reports silently vanish
instead of accumulating visibly. A silent failure is worse than the mess. If
this is revisited, pair the ignore with a CI artifact upload so the reports
remain visible on the PR.

---

## S9 — Warning counts ratchet; they never grow

`npm run lint` emits ~295 warnings and 0 errors. A number that only rises is
indistinguishable from no rule — which is how 53 files quietly passed a limit
the docs called "Enforced".

**Do:** baseline today's count and fail on any increase. Fix on touch, not in a
big-bang pass. `check-structure.sh` works this way: pre-existing findings sit in
`scripts/ci/.structure-baseline`, and only **new** ones warn.

**Never:** add a warning-level rule with no baseline. It becomes wallpaper
within a week.

**Enforced:** `check-structure.sh --strict` fails on any finding not in the
baseline. Accept reviewed findings with `--update-baseline`.

---

## Conclusion — where SOLID applies here, and where KISS does

Being straight about this: most of what went wrong in this repo was **not** a
SOLID violation. SOLID governs how objects and modules depend on each other.
What actually happened was **entropy** — half-finished migrations left standing
next to the things that replaced them. Two of the five principles map cleanly,
one partially, two barely. Forcing all five would be the same false precision
as a rule doc that claims to be enforced and isn't.

**Interface Segregation — the strongest fit.** `lib/supabase/index.ts` re-exported
server utilities (`next/headers`, service-role config) through the same barrel a
client component imported. Consumers were forced to depend on — and would have
been broken by — things they never used. That is textbook ISP, and it is exactly
why the split between `lib/supabase/client.ts` and `lib/supabase/server.ts`
matters. **S1** and **S3** protect it.

**Dependency Inversion — already done well; keep it.** `lib/logger.ts` is a
stable facade over swappable Pino/console/edge backends (ADR-0003), which is why
270 import sites survived a directory move untouched. Depend on the facade, not
the backend. The repo got this right; the rules exist to stop it eroding.

**Single Responsibility — partial fit.** `lib/services/` at 85 files and
`user.repository.ts` at 457 lines are SRP pressure, and the 200-LOC limit is a
proxy for it. But a file being long is a _symptom_; the actual failure here was
duplication, not conflated responsibility.

**Open/Closed and Liskov — weak fit, and I won't pretend otherwise.** The closest
Liskov relative is the two `authenticateRequest` functions: same name promising
substitutability, delivering incompatible signatures. That is a naming failure
(**S3**), not a subtyping one. Open/Closed had no bearing on anything found.

**KISS is the real lesson.** Every finding was _excess_ structure, never
insufficient structure:

| Was                  | Is                | The simpler thing           |
| -------------------- | ----------------- | --------------------------- |
| 5 data-access layers | 2                 | Put code where it's used    |
| 3 schema type files  | 1                 | Generate it, gate the drift |
| 3 logging modules    | facade + backends | One public entry point      |
| 13 script shims      | 0                 | One way to invoke           |
| 2 hooks locations    | 1                 | One home per kind of thing  |

Nothing was fixed by adding an abstraction. Everything was fixed by **removing
one** — 24,797 lines deleted across three phases, with the schema unification
turning 18 latent runtime bugs into compile errors on the way.

So the operating principle, in order:

1. **Delete before you design.** Most structural problems here dissolved on
   deletion. Reach for a new layer only after removal is ruled out.
2. **One name, one thing, one place** (S1, S3). Ambiguity is what turns
   duplication from untidy into dangerous.
3. **Make the boundary real where it is load-bearing** (ISP/DIP — client vs
   server, facade vs backend). Everywhere else, prefer flat.
4. **Ship the check with the rule** (S9), or accept that the rule is a wish.
