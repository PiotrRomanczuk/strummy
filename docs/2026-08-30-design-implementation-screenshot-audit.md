---
created: 2026-08-30
updated: 2026-08-30
---

# Design → implementation, checked with screenshots

Every mounted surface that a Claude Design artboard claims, photographed against the
artboard it claims to implement. 32 captures (3 roles × 2 widths), taken by
`tests/e2e/design-audit/capture.audit.ts` on the self-hosted runner against the
`StudentDevelopment` stack, run
[33296730441](https://github.com/PiotrRomanczuk/strummy/actions/runs/33296730441).
43 of the 44 design bundles rendered locally for the other side of each pair.

This is the picture version of `docs/app-blueprint/93-design-mockup-audit.md`, which
established the mockup → route mapping by reading code. Where the two disagree, this
document is the newer one — and three of its disagreements are listed under **F11**.

## Verdict

**The redesign landed on the core CRM and stopped at its edges.** Lessons, songs,
assignments, users, the fretboard and the three forms carry the Editorial Light
system convincingly — Fraunces headings, mono eyebrow labels, gold accents, card
chrome, ivory ground. Sign-in, the chord quiz and the lower half of Settings never
received it and still render in the pre-redesign style. Two of the three role
dashboards implement the _layout_ of their artboard without the _content_ the
artboard was about.

Counting only what a picture can settle:

|                                                                                  | Surfaces |
| -------------------------------------------------------------------------------- | -------- |
| Faithful to the artboard                                                         | 9        |
| Right system, material content missing                                           | 6        |
| Different design system entirely                                                 | 3        |
| Empty at capture time, not judgeable                                             | 4        |
| Artboard is from an older design generation — app is the more current of the two | 2        |

---

## Findings

### F1 — Two design generations are live in the same product

The clearest single-screen evidence is the **Song Detail action bar**, which carries
four button styles in one row: `EDIT SONG` (mono caps outline), **Set as Song of the
Week** (blue, with a star icon), **Delete song** (red), `DUPLICATE` / `+ ASSIGN TO
STUDENT` (mono caps outline). Blue appears nowhere in the design system.

The same split runs down whole pages:

- **`/dashboard/settings`** renders two design languages stacked. Profile /
  Notifications / Danger zone use eyebrow labels, Fraunces headings and the black
  primary button. Below them, **Integrations** and **API Keys** use bold sans-serif
  headings, no eyebrows, a different card treatment, **amber/brown** buttons and a
  plain sortable table with a green "Active" pill.
- **`/sign-in`** has no card, a bold sans-serif `Sign in to Strummy` (the artboard
  has an eyebrow `WELCOME BACK` and a gold-italic `Sign in.`), an **amber** primary
  button where the system uses black, and a stray "Pro Tip" fragment below the fold.
- **`/dashboard/skills/chord-quiz`** is a bare white page with a sans-serif heading —
  none of the palette, type or chrome, and none of the artboard's dark theme.

**Do:** treat the primary-button colour as the tell. Black is the system; every
amber, blue or red primary marks a surface the redesign missed.

### F2 — The student dashboard implements the frame, not the idea

The artboard's entire premise is a countdown and a plan: `NEXT LESSON — in 2h 14m`
with a week practice bar chart and **Start today's practice**; a `Today's practice ·
30 min · 3 pieces` checklist with per-item play buttons and the teacher's note; a
last-lesson recap with tickable homework; an 11-day **streak** with progress to a
badge; a repertoire list with mastery meters and filter chips; an activity feed;
achievements.

The app ships: Song of the week, Next lesson (empty state), Assignments due,
Songs you're working on. No countdown, no practice checklist, no streak, no
activity, no achievements, no mastery meters.

It also has a **layout defect**: on a 1440px viewport the content column is roughly
530px wide and the right half of the screen is empty. The artboard is a two-column
grid. This is the one finding here that is a bug rather than a scope decision.

### F3 — Three admin cards ship a description of the feature instead of the feature

`/dashboard` as admin renders **At-risk students**, **Cohort insights**, **Audit log**
and **Services** as cards whose body is a sentence in the voice of a spec:

> "Students whose practice has gone quiet or whose progress has stalled will surface here."
> "A single timeline of system events — invites, role changes and deletions. Each record type keeps its own history today; this unifies them."
> "Live status for the database, hosting, Google Drive, Spotify and the AI providers."

The artboard has all four working: churn % per student with **Draft email** buttons,
stacked cohort-health bars across three tenure bands, per-service latency and uptime
with a `5/6 OK` roll-up. The app's headline row is also five raw counts
(Users/Students/Teachers/Songs/Lessons) where the artboard has a health verdict
(`Healthy · 1 watch`) plus trended metrics.

### F4 — Fretboard Explorer is about 40% of its artboard

Present: mode toggle, key grid, scale dropdown, three display toggles, scale notes,
formula, a one-line "About". Missing: **audio playback** (Play scale, BPM, volume,
mute), **CAGED position selector** and the five shape diagrams, **"Quiz me on this
scale"**, **diatonic chords**, **shareable link / save preset**, the three board
styles (Studio / Engraved / Mono), the scale shortcut buttons, and frets 9–15 — the
app draws 8 frets as a **grid table**, the artboard draws a 15-fret neck.

This is the largest single-surface content gap after F2, on a route that is
`nav-hidden` — so nobody finds it to notice.

### F5 — The assignments PROGRESS column is dead

`/dashboard/assignments` renders a `PROGRESS` column and every one of the 23 rows
shows `–`. The artboard's rows carry a progress bar with a percentage and a "last 2d
ago" recency stamp; that is what the column was for. Either wire it or drop it — a
column of dashes reads as broken, not as absent.

### F6 — The page background stops where the content stops

On every short page the ivory ground ends at the last card and the rest of the
viewport is white: `/dashboard/notifications`, `/dashboard/fretboard`,
`/dashboard/skills/chord-quiz`, and the student `/dashboard/lessons` and
`/dashboard/assignments`. The sidebar is full height, so the seam is a horizontal
line across the main column. All five captures are 900px tall — the viewport height —
so this is what a user sees, not a screenshot artefact.

Likely a `min-h-screen` (or `min-h-dvh`) missing on the main content wrapper.

### F7 — The teacher topbar lost its whole toolset

The artboard's topbar carries a search field, a `Week 17` pill, a notification bell
and a black **+ New lesson**. The app's topbar carries the avatar and name, nothing
else. Search moved into the sidebar; the week indicator, the bell and the primary CTA
have no home. This is why the artboard's dashboards read as a workspace and the app's
read as a document.

### F8 — The sidebar dropped ANALYTICS and Theory

The artboard groups TEACHING (Dashboard, Lessons, Songs, Assignments, **Theory**) /
STUDENTS / **ANALYTICS (Song Stats, Lesson Stats)** / TOOLS. The app has TEACHING /
STUDENTS / TOOLS and no ANALYTICS group — although `/dashboard/stats`,
`/dashboard/songs/analytics`, `/dashboard/admin/stats/*` and `/dashboard/theory` all
exist as routes. Built surfaces with no way in. The app also renames Students → People.

### F9 — Lessons and songs are master-detail; the artboards are not

A row on `/dashboard/lessons` links to `/dashboard/lessons?selected=<id>` and opens a
side panel; only that panel offers the full page. Same on `/dashboard/songs`. No row
on either list is an anchor to its detail route — which is worth knowing before
writing any spec, deep link or crawler against those lists, and cost this audit two
capture runs to discover.

### F10 — The artboard set is not one design system, so "implement the mockups" is undefined

**Student Detail (Healthy)** and **Student Detail (At Risk)** are from an earlier
design generation: an icon-rail sidebar, sans-serif throughout, and an
**attendance % + account balance + invoice** model that does not exist in Strummy.
The shipped `/dashboard/users/[id]` is _closer to the current design system than its
own artboard is_ — hero with avatar and metric row, `AT RISK` / `UNCLAIMED` pills,
five tabs, practice sparkline, teacher notes.

Before any further "build the mockup" work, decide which generation is canonical.
Nine of the 44 artboards predate the Editorial Light system.

### F11 — `93-design-mockup-audit.md` is stale in three places

Corrected by these captures:

| The audit says                                                                              | The screenshots show                                                                                                 |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| at-risk is "partial — signal is mounted, on the wrong screen" (teacher dashboard card only) | `/dashboard/users/[id]` renders an `AT RISK` pill in the hero                                                        |
| Lesson Form: "Recurring… action dropped", "song-card grid → `<select multiple>`"            | Recurrence section is present; songs are a searchable checkbox list                                                  |
| Song Detail: "no quick-assign panel", "no sections/progressions"                            | Quick-assign panel with student checkboxes, due date and goal; a "Sections & progressions" card with **Add Section** |

Still accurate: student picker is a `<select>` rather than avatar pills; no audio
player; no tablature.

### F12 — The dev stack's data makes every one of these screens hard to read

Not a design finding, but it is in every screenshot and it costs real review time:

- `/dashboard/lessons` shows **68 past lessons**, of which roughly 40 are
  `E2E Audit Log Lesson 1785612…EDITED`, all the same student, all the same day.
- A seeded profile named `Emma Wright Test Test Test Test…` (24 repetitions) **overflows
  the topbar** on every student capture and breaks the quick-assign checkbox list on
  Song Detail.
- Admin counts read 5404 users / 1768 students / 1690 teachers against 6 real
  students.

The E2E suites clean up by title pattern; these survived. Worth a one-off sweep of the
dev stack before the next manual QA pass.

---

## Per-surface results

Verdicts: **✓** faithful · **◐** right system, content missing · **✗** different design
system · **·** empty at capture, not judgeable · **⟲** artboard predates the current system

| Surface               | Route                          | Artboard                         | Verdict                                                                                         |
| --------------------- | ------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Landing (desktop)     | `/`                            | Landing Page Desktop             | ✓ hero is near-exact; copy re-grounded on purpose                                               |
| Landing (mobile)      | `/`                            | Landing Page Mobile              | ✓                                                                                               |
| Sign in               | `/sign-in`                     | Auth Sign In                     | ✗ see F1                                                                                        |
| Teacher dashboard     | `/dashboard`                   | Teacher Dashboard                | ◐ day-spine + right rail present; topbar and week-density tiles missing (F7)                    |
| Student dashboard     | `/dashboard`                   | Student Dashboard                | ◐ see F2 — the largest gap                                                                      |
| Admin dashboard       | `/dashboard`                   | Admin Dashboard                  | ◐ see F3                                                                                        |
| Lessons list          | `/dashboard/lessons`           | Lesson List (+Mobile, +Student)  | ✓ filters, year chips, sort, status pills, role-aware copy                                      |
| Lesson detail         | `/dashboard/lessons/[id]`      | Lesson Detail (+Mobile)          | ✓ songs with mastery meters, lesson info, continuity                                            |
| Lesson form           | `/dashboard/lessons/new`       | Lesson Form                      | ✓ sections, counters, sticky preview, recurrence                                                |
| Song detail           | `/dashboard/songs/[id]`        | Song Detail                      | ◐ structure is there; action bar is four styles (F1)                                            |
| Song form             | `/dashboard/songs/new`         | Song Form A / Mobile             | ✓ closest match in the app                                                                      |
| Fretboard             | `/dashboard/fretboard`         | Fretboard Explorer (+Mobile)     | ◐ see F4                                                                                        |
| Chord quiz            | `/dashboard/skills/chord-quiz` | Chord Quiz Design                | ✗ see F1                                                                                        |
| Assignments (teacher) | `/dashboard/assignments`       | Assignments Teacher              | ◐ no inline composer; dead progress column (F5)                                                 |
| Assignments (student) | `/dashboard/assignments`       | Assignments Student              | · empty for the seeded student                                                                  |
| Assignment form       | `/dashboard/assignments/new`   | Assignment Form                  | ✓                                                                                               |
| Notifications         | `/dashboard/notifications`     | Notifications (+Mobile)          | · empty; background bug (F6)                                                                    |
| Settings              | `/dashboard/settings`          | Settings / Settings Integrations | ✗ split page, see F1                                                                            |
| Student detail        | `/dashboard/users/[id]`        | Student Detail Healthy / At Risk | ⟲ see F10                                                                                       |
| Student form          | `/dashboard/users/new`         | Student Form                     | ✓                                                                                               |
| Onboarding            | `/onboarding`                  | Onboarding Student               | · redirects to `/dashboard` for an onboarded account — correct behaviour, nothing to photograph |

## What this cannot tell you

- **Empty data is not a verdict.** Four surfaces were empty for the seeded accounts.
  The teacher's schedule spine, the notifications list and the student's assignments
  are all judged on chrome only.
- **One record per detail view.** Lesson, song and student detail were photographed on
  whichever record the list offered first — the song happened to be an RLS test
  fixture with no chords.
- **Scroll-triggered content.** A full-page screenshot does not scroll, so any section
  that animates in on `whileInView` may be blank below the fold. The landing page shows
  a large void under the hero for this reason; its total height (5717px vs the
  artboard's 5582px at the same width) says the content is there.
- **Static only.** Nothing here exercises hover, focus, dark mode, error or loading
  states, or any interaction.
- **Not production.** Captures come from a production build of this branch against the
  dev stack, not from `strummy.online`.

## Re-running this

```bash
gh workflow run design-capture.yml          # once the workflow is on main
```

Images land as the `design-audit-screenshots` artifact and on the throwaway
`capture/design-audit` branch. Add or retarget a surface in
`tests/e2e/design-audit/capture.manifest.ts`.
