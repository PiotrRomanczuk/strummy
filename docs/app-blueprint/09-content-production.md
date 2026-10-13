---
created: 2026-07-18
updated: 2026-10-13
domain: Content Production & Media
tables: [content_posts, content_post_metrics, hashtag_sets, song_videos, drive_files]
maturity: mixed
---

# Content Production & Media

## Purpose

The owner's video/social pipeline plus the app's Google-Drive media layer. Two distinct halves:

1. **Social pipeline** (`song_videos` production state + `content_posts` per-platform slots +
   `hashtag_sets` + `content_post_metrics`) — plan, publish, and track short-form guitar videos
   on TikTok / Instagram / YouTube Shorts.
2. **Drive media** (`drive_files`, and `song_videos` storage columns) — Google Drive files
   attached to songs, lessons, assignments, and profiles, streamed through the app.

**Strategic status (grill decision 2026-07-18): the social pipeline is PARKED.** It is marketing
tooling, not student trust, so it is excluded from the v1/v1.1 trust pass. Its gaps below carry
briefs but are explicitly "parked — backlog, not v1/v1.1". Drive media, by contrast, serves the
core loop (song/lesson attachments) and stays live.

## Data model

| Table                  | Role                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `song_videos`          | A recording of a song stored on Drive: Drive file ids, duration/thumbnail, quality checklist (`is_recording_correct`, `is_well_lit`, `mic_type`, `is_audio_mixed`, `is_video_edited`), `production_status` (`idea → recording → edited → ready`), per-platform `published_to_*` flags + media ids, song `match_confidence`/`match_source` |
| `content_posts`        | Per-platform distribution slot for a video: `platform` (`tiktok/instagram/youtube_shorts`), `status` (`planned/scheduled/published/archived/failed`), schedule/publish times, hook/caption, `hashtag_set_ids[]` + extras, external ids, cached engagement counters                                                                        |
| `content_post_metrics` | Time-series snapshots of a post's engagement (views/likes/comments/shares/saves)                                                                                                                                                                                                                                                          |
| `hashtag_sets`         | Reusable named hashtag bundles referenced by posts                                                                                                                                                                                                                                                                                        |
| `drive_files`          | Polymorphic Drive attachments — see visibility model below                                                                                                                                                                                                                                                                                |

**`sync_song_video_published_flag()`** (trigger on `content_posts` insert/delete/status change):
recomputes the parent `song_videos.published_to_{tiktok,instagram,youtube_shorts}` flags from the
set of `published` posts, so the video row is always an accurate rollup of its distribution slots.

**`drive_files` polymorphic attachment + visibility model**: one row per Drive file, attached via
`entity_type` (`song/lesson/assignment/profile`) + `entity_id`; `file_type` in
`audio/pdf/video/document/image`; soft-delete via `deleted_at`; ordered by `display_order`.
Visibility is a three-level enum: **`private`** (uploader/teacher only), **`students`** (visible
to students linked to the entity), **`public`** (any authenticated user). Enforced by RLS plus
the `/api/drive/files*` handlers; binary content streams through
`/api/drive/files/[fileId]/stream` so Drive credentials never reach the client.

## Behavior & rules

- **Production checklist** — `song_videos.production_status` advances `idea → recording → edited
→ ready`; the boolean quality flags are the recording checklist
  (`RecordingQualityForm`).
- **Distribution** — a `ready` video gets one `content_posts` row per target platform; publishing
  is manual (external ids/URLs pasted back), no platform API integration.
- **Metrics** — entered manually via `PostMetricsForm`; each save appends a
  `content_post_metrics` snapshot and updates the cached counters on the post.
- **Drive scan** — `app/api/cron/drive-video-scan` (daily 03:00) walks the Drive folder via
  `lib/services/drive-video-sync.ts`, creates `song_videos` rows for new files, auto-matches
  them to songs (`match_source` `auto/manual/spotify`, `match_confidence` 0–100), and notifies
  admins.
- **API** — `/api/content/{posts,posts/[id],posts/[id]/metrics,hashtag-sets,calendar}` (RLS-scoped,
  teacher/admin only; ADR-0001 — handlers don't re-filter ownership);
  `/api/song/[id]/videos*` for per-song recordings; `/api/admin/drive-videos*` for the admin
  video pool; `/api/drive/files*` for generic attachments.

## UI surfaces

| Surface                 | Route / component                                                                                            | Status                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Production tab          | `components/songs/production/ProductionTab.tsx` inside `SongDetailTabs`                                      | **built-unmounted** — tab gated behind `{false &&}` |
| Post/metrics forms      | `PostList`, `PostFormDialog`, `PostMetricsForm`, `HashtagSetPicker`, `RecordingList`, `RecordingQualityForm` | built (children of ProductionTab)                   |
| Admin drive videos      | `/dashboard/admin/drive-videos`                                                                              | placeholder page → **unbuilt** UI                   |
| Song/lesson attachments | Drive file lists inside song & lesson detail (docs 02, 03)                                                   | **mounted** (via their domain editors)              |

**Blocker verification (2026-07-18)**: `SongDetailTabs.tsx` still hides the Production tab with a
comment "content_posts tables not yet live in prod (pending migration
`20260427120000_content_production.sql`)". That blocker is **stale**: `content_posts`,
`content_post_metrics`, and `hashtag_sets` are all present in the verified baseline
(`cloud_schema_2026-06-22.sql`) and therefore in StrummyProd. Nothing schema-side prevents
re-enabling the tab — it stays off only because the pipeline is parked. (Today's live stack,
StudentManager, predates the cutover; re-enable after cutover, not before.)

The old superseded-spec cleanup items (delete `AppSidebar` content nav entry, prune
`/dashboard/content/*` placeholders) are done — those routes and the nav entry no longer exist.

## Gaps & planned work

CNT-2…4 are **parked — backlog, not v1/v1.1** (grill decision 2026-07-18). CNT-5…8 were added
2026-10-13 as an **active** owner-motivation thread (recording backlog fed by lesson transcripts)
and are ordered in [90-roadmap.md](90-roadmap.md) Tranche 6.

_Shipped 2026-07-19: CNT-1 (Production tab re-enabled)._

### CNT-2 — admin drive-videos page (parked)

`/dashboard/admin/drive-videos` is a "Coming soon" placeholder while `/api/admin/drive-videos`
works. Build a review UI for the scanned pool (confirm/deny auto-matches using
`match_confidence`). Parked — operator tooling.

### CNT-3 — automated metrics ingestion (parked)

`content_post_metrics` is manual entry only. Platform-API ingestion is explicitly out of scope
until the pipeline itself is unparked.

### CNT-4 — backfill the owner's real TikTok channel as seed data (parked)

The owner's live channel `@justmeandguitars` is this pipeline running by hand: 24 song covers +
5 engagement posts, captured 2026-07-19 with view counts, captions, and hashtags in
[reference/TIKTOK_CHANNEL_DATA.md](reference/TIKTOK_CHANNEL_DATA.md) (schema mapping + a
machine-readable seed block). Write a dev loader (`scripts/database/seeding/dev/`) that inserts,
per cover: a `songs` row (populating the `tiktok` link + doc-03 catalog seed), a `song_videos` row
(`production_status='ready'`, `match_source='manual'`, `match_confidence=100`), a `published`
`content_posts` row (let `sync_song_video_published_flag()` set the `published_to_tiktok` flag),
and one `content_post_metrics` snapshot; plus one `hashtag_sets` row (`acoustic-cover-base`).
**Value**: un-hollows the Production tab demo (CNT-1) and gives `content_post_metrics` a real
baseline instead of a cold start. Acceptance: loader is idempotent (keyed on title+artist), a
seeded StrummyProd-shaped DB renders the Production tab with real rows, and
`sync_song_video_published_flag` produces correct rollups. Parked with the rest of the domain —
do after cutover, alongside CNT-1.

### CNT-5 — lesson transcript attached to the lesson (active 2026-10-13)

**Context**: since 2026-10 the owner records lessons as live transcriptions (speaker-labelled
text, not audio). Today that text has nowhere to go but a chat window. It is the raw material
for both better lesson notes (doc 02 / 08) and the recording backlog below.

**Missing**: a place to store it. **Approach**: `lesson_transcripts` (`lesson_id` unique,
`body text` ≤ 100k chars — reuse the `CommonSchema` transcription bound, `source enum(paste,
upload)`, `language`, `created_at`); teacher-only RLS (student never reads raw transcripts —
they contain small talk about third parties); "Transkrypcja" section on the lesson edit page
with a paste box and a file drop (`.txt`/`.md`). Never sent to a cloud LLM without the
`AI_PREFER_LOCAL` route being considered — raw transcripts name people.
**Files**: `supabase/migrations/…_lesson_transcripts.sql` · `app/actions/lesson-transcripts.ts`
· `components/lessons/LessonForm.Transcript.tsx`. **Accept**: paste → save → reload shows it;
student role gets `0 rows`; RLS test proves it.

### CNT-6 — "sztos, trzeba to nagrać": song mentions mined from the transcript (active)

**Missing**: the moment in a lesson when the teacher says a song is great and should be recorded
evaporates. `songs.recording_queued_at` / `recorded_at` already exist (toggle in
`app/actions/songs.ts:340`), so the queue has a home — nothing feeds it.

**Approach**: a `transcript-song-miner` agent (doc 08 registry) that takes a transcript and
returns `{ title, artist?, confidence, sentiment: 'enthusiastic'|'neutral', quotes[] }` per
mention, matched against the catalog (`songs.search_vector`, fuzzy on title) and flagged
`new` when absent. Teacher reviews a checklist on the lesson page: per row **"Dodaj do lekcji"**
(→ `lesson_songs`), **"Do nagrania"** (→ `recording_queued_at = now()`, creating a draft `songs`
row when `new`), **"Pomiń"**. Nothing is written without the click (same contract as every
AI surface in doc 08). Enthusiasm cue words in Polish (`sztos`, `zajebist*`, `mega`, `trzeba to
nagrać`, `fajne`) are prompt examples, not a regex gate.
**Files**: `lib/ai/agents/transcript-song-miner.ts` · `app/actions/transcript-mining.ts` ·
`components/lessons/LessonTranscript.Mentions.tsx`. **Accept**: on the owner's real 2026-10-13
lesson transcript (kept out of the repo — it names people) the miner returns Queen — _Hammer to Fall_ and _Now I'm Here_ (both enthusiastic)
and does not invent a third; accepting the second row queues it for recording and links it to the
lesson in one click.

### CNT-7 — "Do nagrania" board + motivator card (active)

**Missing**: the queue is invisible except as a per-song toggle. The owner wants the app to
**nag him to record**, not to manage socials.

**Approach**: `/dashboard/songs/recording-queue` (teacher): table of queued songs — title,
artist, queued since, which lesson/student it came from (via `lesson_songs` + CNT-6
provenance), the quote that made it a "sztos", level; sort oldest-first; actions "Nagrane" (sets
`recorded_at`, optionally creates a `song_videos` row — the existing pipeline) and "Zdejmij".
Teacher home gets a **"Do nagrania"** card: queued count, recorded this month vs last, the
oldest item with its age in days, one button to the board. Streak = consecutive weeks with ≥1
`recorded_at`. No social metrics on this card (CNT-3 stays parked).
**Files**: `app/dashboard/songs/recording-queue/page.tsx` ·
`components/songs/recording-queue/RecordingQueue.tsx` (+ `.Row.tsx`) ·
`components/dashboard/teacher/…RecordingCard.tsx` · nav under "Utwory". **Accept**: a song
queued from CNT-6 appears on the board with its lesson and quote; marking it recorded moves the
month counter; the card shows "najstarsze: 23 dni" for a 23-day-old item.

### CNT-8 — transcript → lesson-notes draft (follow-on, active)

**Missing**: `lesson-notes-assistant` (doc 08) drafts from the teacher's bullet points; the
transcript is a far better input. **Approach**: extend the agent's input with
`lesson_transcripts.body`; output Polish notes in the existing structure (co ćwiczyliśmy, co
poszło, zadanie na tydzień) plus the CNT-6 mention list as a side channel so one call serves
both. Teacher edits before save, as today. **Accept**: the sample transcript yields notes naming
the A–D–E shape-shifting exercise and the _Now I'm Here_ intro riff (5-3-2-1 on the A/D
strings, muted low E), nothing about Japan.

## Test plan

- No dedicated E2E (parked domain; `reference/E2E_JOURNEYS.md` has no content-pipeline journey —
  A3.2 covers song attachments). When CNT-1 lands, add one journey: open Production tab → create
  post → enter metrics → snapshot persisted.
- **Unit/integration**: `/api/content/*` handler tests (Zod contracts in
  `schemas/ContentPostSchema.ts`, `schemas/HashtagSetSchema.ts`); `sync_song_video_published_flag`
  rollup belongs in a Jest integration test against local Supabase.

## Open questions

- CNT-5/6: transcripts quote students and third parties by name. Local-model-only (Ollama)
  for mining, or acceptable to send to OpenRouter with names stripped? Decide before CNT-6 ships.
- CNT-6: should a "new" song created from a mention be `is_draft = true` until the teacher
  fills chords, or a normal row? Draft assumed.
- Does `drive_files` eventually absorb `song_videos`' storage columns (one attachment model), or
  do recordings stay a separate table because of the production workflow fields? Revisit when the
  pipeline is unparked.

## References

- Superseded: `docs/specs/09-content-production.md` (deleted 2026-07-18; git history)
- Code: `components/songs/production/*`, `app/api/content/*`, `app/api/drive/files*`,
  `lib/services/drive-video-sync.ts`, `app/api/cron/drive-video-scan`
- Schema: `supabase/baseline/cloud_schema_2026-06-22.sql` (5 tables +
  `sync_song_video_published_flag`)
- Seed dataset: [reference/TIKTOK_CHANNEL_DATA.md](reference/TIKTOK_CHANNEL_DATA.md) — real
  `@justmeandguitars` capture mapped onto this domain (CNT-4)
- Related domains: songs (03) for Spotify matching; admin (10) for the drive-scan cron
