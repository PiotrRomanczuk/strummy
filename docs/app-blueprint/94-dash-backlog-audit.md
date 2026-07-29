---
created: 2026-07-28
updated: 2026-07-28
---

# DASH-\* Backlog Audit

Cross-reference of the 55 open GitHub issues (`DASH-006` … `DASH-060`, all created 2026-05-17)
against what is actually mounted in this codebase today. Not a domain doc — a point-in-time
inventory + comparison in the same spirit as [93-design-mockup-audit.md](93-design-mockup-audit.md),
kept living so it can be re-run cheaply if the backlog is ever revived.

## Source & method

The issues are the residue of a **dashboard rebuild** planned on branch
`feature/STRUM-dashboard-cleanup` in the pre-rename repo `STRUMMY-guitarCRM`. Five agents audited
11–13 issues each on 2026-07-28, verifying every issue's `## Builds` paths, `## Reads / writes`
contracts, and `## Acceptance` criteria against `app/`, `components/`, `lib/`,
`supabase/migrations/`, and `tests/`. Verdicts are grounded in opened files, not filename matches —
the `## Builds` paths turned out to be unreliable in both directions (see
[Systemic defects](#systemic-defects-in-the-backlog-itself)).

## Headline

**The backlog is not a plan of work — it is a snapshot the codebase overtook.**

| Verdict                                           | Count |
| ------------------------------------------------- | ----- |
| **Shipped** — feature exists, acceptance met      | 17    |
| **Partial** — built, one identifiable gap remains | 27    |
| **Obsolete** — contradicted by a later decision   | 8     |
| **Open** — genuinely nothing built                | 3     |

Only **three** of fifty-five describe work that was never started. The audit's real yield is not
the triage — it is eight live defects, listed next, that no issue and no gap ID tracked.

## Live defects found while verifying

None of these were filed anywhere. Four are role-enforcement or broken-route problems, and are
ordered into [90-roadmap.md](90-roadmap.md) Tranche 2 with the IDs below.

| ID        | Defect                                                                                                                                                                                                                 | Evidence                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **ADM-5** | `/api/stats/weekly` has **no role check** — any authenticated student reads studio-wide counts (lessons completed, new students, songs added)                                                                          | `app/api/stats/weekly/route.ts`                              |
| **ADM-6** | `/api/students/pipeline` has **no role check** — session-only guard on an endpoint its own issue designates admin-only. No UI consumer; delete rather than guard                                                       | `app/api/students/pipeline/route.ts:14-16`                   |
| **ADM-7** | `/api/students/needs-attention` has **no role check**. Dead code — the mounted card uses `getAtRiskStudents` instead                                                                                                   | `app/api/students/needs-attention/route.ts:23-26`            |
| **ADM-8** | `/api/cohorts/analytics` returns **404 to everyone including admins** — authorizes off `profiles.role`, a column that does not exist (roles are `is_*` booleans)                                                       | `route.ts:35-46` vs `types/database.types.ts` profiles block |
| **ASG-6** | **Admins see only assignments where they are the teacher**, not all — unconditional `.eq(asStudent ? 'student_id' : 'teacher_id', userId)`                                                                             | `lib/services/assignments-queries.ts:96`                     |
| **IDA-6** | User-list student-status filter offers **four impossible enum values** (Lead/Trial/Inactive/Churned vs a two-value enum); PostgREST rejects, the error is swallowed, and the user sees "No people match these filters" | `components/users/UsersList.FiltersForm.tsx:97-103`          |
| **CAL-4** | Calendar webhook control is **one-way and mints duplicate channels** on repeat click — bare `.insert()`, never reads `webhook_subscriptions`                                                                           | `app/actions/calendar-webhook.ts:47`                         |
| **LES-6** | `/api/lessons/schedule` queries **`teacher_availability`**, a table in neither migrations nor generated types → runtime failure                                                                                        | `app/api/lessons/schedule/route.ts:34`                       |

ADM-5/6/7 and ASG-6 are masked in production because the owner is currently the sole teacher **and**
admin. They stop being masked the moment a second teacher exists — i.e. they are latent
[92-launch-runbook.md](92-launch-runbook.md) risks, not cosmetic.

## Triage of the 55

### Close — 55 → 24 (31 issues)

Work is done, or the decision went the other way.

`#362` `#363` `#364` `#369` `#373` `#374` `#375` `#376` `#377` `#379` `#383` `#384` `#388` `#390`
`#391` `#393` `#394` `#396` `#398` `#399` `#400` `#403` `#404` `#405` `#407` `#409` `#410` `#411`
`#413` `#414` `#415`

Worth naming individually:

- **#407 (API keys) asserts a fixed vulnerability.** Its acceptance table demands "student:
  generate + revoke". That was deliberately locked to staff in the 2026-07-27 click-through sweep;
  `tests/e2e/settings/api-keys.spec.ts:70-75` says so outright — _"asserting the old behaviour
  would be asserting the vulnerability."_
- **#363, #374, #390, #398, #404, #405, #409, #414 ask to rebuild things deliberately removed or
  dispositioned.** #363 → LES-1 shipped _by deletion_; #374 → streak cards deleted in the
  dead-component purge with four design questions logged first ([04](04-practice-progress.md));
  #409 → `saveUserSettings` deleted by IDA-1; #404/#405 → tables the blueprint marks "no UI
  planned" / "candidate for removal" ([08](08-ai-assistant.md)).
- **#390 is unbuildable as written.** `public.student_status` is `ENUM ('active','archived')` —
  a lead → active → churned funnel needs a migration before any UI exists to build.
- **#393 ≡ SNG-1, #394 ≡ SNG-3, #399 ≡ CNT-2.** Duplicate tracking; in all three the blueprint
  brief is richer _and_ carries an open design question the issue asserts away.

### Rewrite to the one remaining gap — 18 issues

Each is 80–95% built with a single identifiable hole. Sizes on the labels are wrong for all of
them.

| Issue  | What actually remains                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `#365` | No reschedule dialog / cancel button — cancelling means picking `CANCELLED` in a status dropdown            |
| `#366` | Inline notes editing + autosave. Notes are read-only for **everyone** incl. teachers; zero `debounce` hits  |
| `#370` | Repertoire status filter + recency sort (card grid ships; no `started_at`, no sort control)                 |
| `#372` | Decide `self_rating` vs `difficulty_rating` — the action ships and is unmounted; the card writes the other  |
| `#378` | Student "Add to repertoire" CTA on song detail                                                              |
| `#380` | Surface Spotify rate-limit / circuit-open state; `spotify_track_id` is never written                        |
| `#381` | Wire the already-implemented `validateOnly` dry run to the UI (hardcoded `false`)                           |
| `#382` | Admin picker + student card — 4 integration-tested SOTW actions have zero non-test callers (≡ SNG-2)        |
| `#386` | Health-signal columns on the user list + fix the dead status filter (IDA-6)                                 |
| `#387` | The Assignments tab — the other four tabs ship                                                              |
| `#389` | CSV format (only json/pdf/xlsx), practice data in the payload, and an export button that exists             |
| `#392` | The charts — KPI tiles ship, chart slots are `ComingSoonBody` placeholders; also blocked by ADM-8           |
| `#395` | **One import.** A complete 210-line `HealthPageClient.tsx` sits beside a "Coming soon" `page.tsx`           |
| `#397` | The preview / dry-run step. Auto-shadow-student and idempotency already ship in three places                |
| `#401` | AI email draft never reaches SMTP — it hands off via `mailto:` while `lib/email/smtp-client.ts` sits unused |
| `#402` | Per-(student, week) cache + an insights surface on student detail rather than `/dashboard/ai`               |
| `#406` | Mount `requestEmailChange` + `requestAccountDeletion` (both built, unit-tested, unmounted). **Drop MFA**    |
| `#408` | Per-channel toggles — `NotificationPreferences.Item.tsx:29` hardcodes `'email'`; "push" exists nowhere      |

### Decide before rewriting — 6 issues

`#361` `#367` `#368` `#371` `#385` `#412` each hinge on an unresolved question or a missing column:

- `#371` — `tests/e2e/student/repertoire.spec.ts:150` asserts the **inverse** (students must not
  have add/remove controls). Repertoire is teacher-managed via the lesson→repertoire cascade.
- `#385` — the share toggle has **no column**: `assignment_templates` is
  `(id, teacher_id, title, description, checklist, created_at, updated_at)`.
- `#412` — its build path `app/dashboard/skills/page.tsx` is already the shipped CHT-2 Skills hub.
- `#361` — depends on LES-6; its read path is the broken `/api/lessons/schedule`.

## Systemic defects in the backlog itself

Four problems that apply to all 55 and would poison any future issue set written the same way.

1. **Every "Done when" is unsatisfiable.** All 55 require flipping a checkbox in
   `docs/IMPLEMENTATION_PLAN.md` — a file deleted, on a deleted branch, in a repo since renamed.
   Every "Part of" link 404s.
2. **All 55 test gates point at a directory holding three unrelated files.** They demand
   `tests/e2e/dashboard/<x>.spec.ts`; that folder contains only `sidebar`, `states`, `topbar` —
   the residue of DASH-002/003/004. The suite reorganised into role/domain folders (`teacher/`,
   `student/`, `cross-role/`, `ai/`, `notifications/`, `settings/`) with ~62 specs. Judging these
   issues by their stated gate produces 55 false negatives; real coverage exists for most of them.
3. **~6 gates are unachievable by project rule.** They specify "(mocked)" Google Calendar, Spotify
   OAuth, Drive upload, and SMTP — but [91-testing-strategy.md](91-testing-strategy.md) forbids
   mocking in E2E. The repo already solved this and the issues never caught up:
   `tests/e2e/settings/integrations.spec.ts:88-94` intercepts only _our own_ redirect and refuses
   to fake a completed Google login; `tests/e2e/ai/ai-playground.spec.ts:11-14` splits DB-only
   wiring (always runs) from provider-dependent assertions (gated on `E2E_AI_PROVIDER`).
4. **The `## Builds` paths are fiction.** `components/dashboard/cards/` has never existed, yet
   DASH-004 and DASH-005 are closed — DASH-005 shipped as `TeacherDaySpine.tsx`. Triaging by
   grepping the named path mis-classifies in both directions.

Two further clauses are structurally unsatisfiable rather than merely stale:

- **"admin: visible via student-view switcher"** (#369, #374) — `RoleSwitcher.tsx:34` and
  `app/dashboard/page.tsx:64` both gate the student view on `isStudent`, so a pure admin has no
  path into it. Needs either a rewrite or a documented impersonation story.
- **"student: …" on any AI surface** (#400, #404) — `app/dashboard/ai/page.tsx:19-22` and
  `chat/page.tsx:15-17` redirect students by design ([08](08-ai-assistant.md) §Roles).

## Dead code inventory

The dominant pattern across all five slices: **fully implemented, unit-tested, imported by
nothing.** This is what makes the backlog unreadable — the issues read as OPEN while the work is
nearly done. Recommend one decision pass: mount or delete.

| Kind                    | Items                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orphaned components** | `app/dashboard/health/HealthPageClient.tsx` (210 LOC, beside a stub page — and the "Health Monitor" nav link is live, suppressed only by `CORE_LOOP_HIDDEN_ITEMS`) · `app/dashboard/admin/spotify-connect/SpotifyConnectClient.tsx` (6 KB, never imported by its own `page.tsx`) |
| **Unmounted actions**   | `addSongToRepertoireAction` · `removeFromRepertoireAction` · `searchSongsForRepertoireAction` · `updateSelfRatingAction` · the whole `getStudentDashboardData` tree incl. `computePracticeStreakDays` · 4 Song-of-the-Week actions · 3 hashtag-set mutation hooks                |
| **Orphaned routes**     | `/api/teacher/students` · `/api/students/pipeline` (ADM-6) · `/api/students/needs-attention` (ADM-7) · `/api/content/calendar`                                                                                                                                                   |
| **Write-only tables**   | `ai_usage_stats` (3 write sites, no reader — [08](08-ai-assistant.md) records "no UI planned") · `ai_prompt_templates` (zero references) · `skills` / `student_skills` (no app readers) · `user_settings` (retired by IDA-1, still in the schema)                                |

## Blueprint accuracy corrections

Found while verifying; the drift is mostly toward **understating** shipped work. Each still needs
applying to its owning doc.

| Doc                                                         | Correction                                                                                                                                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01](01-identity-access.md):78 vs [90](90-roadmap.md):183   | **Contradiction — resolve before touching #406.** `01` says MFA was removed by design and must not be reintroduced (D-06); the roadmap lists HYG-1 "MFA (TOTP 2FA) enrollment" as **high** priority with a full brief |
| [07](07-notifications-email.md):112                         | "NOT-1 … channel preference **live**" is false — the column exists and the migration pins it to `'email'`; no UI reads it                                                                                             |
| [03](03-songs-repertoire.md):125                            | Song of the Week "unbuilt, nothing mounts the actions" — the teacher read-only card **is** mounted                                                                                                                    |
| [03](03-songs-repertoire.md):119,191                        | `ComingSoonCard` no longer exists anywhere in the tree; the "honesty" open question is already resolved                                                                                                               |
| [03](03-songs-repertoire.md) UI table                       | Teacher add/remove repertoire "mounted via student detail" — it is **status override only**                                                                                                                           |
| [02](02-lessons-calendar.md):128                            | Live mode listed as a "dormant stub" — it was deleted (LES-1), contradicting the doc's own Gaps section                                                                                                               |
| [04](04-practice-progress.md)                               | "Weekly practice chart → mounted" — the rendered `StudentDashboard.tsx` has no chart                                                                                                                                  |
| [05](05-chords-theory.md) UI table                          | Skills hub still called a "Coming soon" stub — CHT-2 shipped it                                                                                                                                                       |
| [03](03-songs-repertoire.md), [04](04-practice-progress.md) | Both marked `nav-hidden`; `menuConfig.ts:182,187` reveals both (2026-07-19)                                                                                                                                           |

## Gaps that would vanish if the issues close silently

Genuine, currently untracked by any gap ID. File these before closing the issues above — they are
the only substantive content the backlog contributes.

- **Lesson notes**: no inline editing or autosave on lesson detail (`#366`) → owner [02](02-lessons-calendar.md)
- **AI email**: draft path never reaches SMTP (`#401`) → owner [08](08-ai-assistant.md)
- **AI insights**: no per-(student, week) cache, wrong surface (`#402`) → owner [08](08-ai-assistant.md)
- **CSV import**: `validateOnly` dry run implemented server-side, never called (`#381`) → owner [03](03-songs-repertoire.md)
- **Spotify**: rate-limit / circuit-open state never surfaced in UI (`#380`) → owner [03](03-songs-repertoire.md)
- **Student detail**: Assignments tab missing (`#387`) → owner [06](06-assignments.md)
- **Export**: no CSV format, no practice data, no button (`#389`) → owner [10](10-admin-observability.md)
- **Test coverage**: `/dashboard/songs/new`, `/dashboard/assignments/new`,
  `/dashboard/assignments/templates` all redirect students in code, but
  `tests/e2e/cross-role/access-control.spec.ts` covers none of them. Existing student specs assert
  "no create button", which would pass even if the routes were wide open → owner
  [91](91-testing-strategy.md)

## Re-running this audit

`gh issue list --state open --json number,title,labels` then verify each issue's `## Builds` and
`## Reads / writes` against the tree. Two rules make it cheap: **never trust the `## Builds` path**
(search by behaviour and route instead), and **never judge by the stated test gate** (check the
role/domain folders under `tests/e2e/`). If the backlog is closed out as recommended, delete this
doc rather than maintaining it — its findings live on as the gap IDs above.

## References

- [90-roadmap.md](90-roadmap.md) — Tranche 2 carries ADM-5…ADM-8, ASG-6, IDA-6, CAL-4, LES-6
- [93-design-mockup-audit.md](93-design-mockup-audit.md) — the sibling inventory doc
- [91-testing-strategy.md](91-testing-strategy.md) — why the "(mocked)" gates are unachievable
- Vault `projects/Strummy/Strummy.md` — owns what is in flight and done
