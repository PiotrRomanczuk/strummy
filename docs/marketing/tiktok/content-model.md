# content/ — versioned source of truth (proposal)

Goal: replace `JustMeAndGuitar_ENHANCED_Plan_May2026.xlsx` as the editable artifact. The xlsx becomes a **build output** generated from these YAML/Markdown files.

## Why

- YAML diffs cleanly in PRs; xlsx does not.
- Sheets become composable — reorder a calendar entry without touching cell coordinates.
- Scripts stop encoding layout (merged ranges, fonts) and instead encode rendering.

## File map (one file per workbook sheet)

| Workbook sheet         | File                  | Format   |
| ---------------------- | --------------------- | -------- |
| 🎯 Strategy Dashboard  | `strategy.yaml`       | YAML     |
| 📅 May Calendar        | `calendar.yaml`       | YAML     |
| 🎸 Song Database       | `songs.yaml`          | YAML     |
| 📖 Story Templates     | `stories.yaml`        | YAML     |
| 📊 Performance Tracker | `performance.yaml`    | YAML     |
| #️⃣ Hashtag Strategy    | `hashtags.yaml`       | YAML     |
| 🤝 Collaborations      | `collaborations.yaml` | YAML     |
| 🎤 Equipment           | `equipment.yaml`      | YAML     |
| (cross-cutting prose)  | `notes/*.md`          | Markdown |

## Schemas (sketch — refine when first generator runs)

### `strategy.yaml`

```yaml
title: '@JustMeAndGuitars — May 2026 Growth Strategy'
sprint_goal: '0 to 1,000 Followers Milestone (May 2026)'
brand:
  pillars: ['Atmospheric Aesthetic', 'Intermediate Shortcuts']
  voice: 'Relatable Teacher + Atmospheric Vibe'
baseline:
  total_followers: 169
  total_videos_posted: 9
  best_video: { title: 'Wish You Were Here', views: 697 }
  avg_views: 267
  engagement_rate_pct: 2.1
goals:
  - { metric: 'Follower Goal', target: 500, note: '+331 followers (+196%)' }
  - { metric: 'Total Videos', target: 20, note: 'Post every 1-2 days' }
  - { metric: 'Avg Views', target: 500, note: '+87% from current' }
  - { metric: 'Viral Video', target: 1, note: 'Focus: Jolene or Hotel California' }
  - { metric: 'Engagement', target: 3.5, note: '+1.4 pp' }
  - { metric: 'Collaboration', target: 1, note: 'Split-screen with @HoodieVoice' }
weekly_breakdown:
  - { week: 1, range: 'May 1-7', videos: 4, focus: 'Beatles + Tracy Chapman power week' }
  - {
      week: 2,
      range: 'May 8-14',
      videos: 5,
      focus: 'Classics: Hotel California, Sound of Silence, Jolene',
    }
  - {
      week: 3,
      range: 'May 15-21',
      videos: 5,
      focus: 'Emotional: Tears in Heaven, Let Her Go, Behind Blue Eyes',
    }
  - { week: 4, range: 'May 22-28', videos: 4, focus: 'Legendary fingerpicking showcase' }
  - { week: 5, range: 'May 29-31', videos: 2, focus: 'Jack Johnson + Jason Mraz happy ending' }
success_indicators:
  - '3+ videos with 500+ views'
  - 'Collab video with HoodieVoice posted'
  - 'Consistent 3 stories daily'
  - '1 video hits 1000+ views'
  - 'Follower count doubles (338+)'
  - 'Equipment upgrade ordered (mic)'
```

### `calendar.yaml`

```yaml
defaults:
  post_window: '18:00-21:00'
  spacing_hours: [2, 3]
  hashtags_per_post: 5
  stories_per_day: 3
  always: 'Reply to ALL comments'
days:
  - date: 2026-05-01
    week: 1
    video:
      song_id: 'wish-you-were-here' # FK into songs.yaml
      angle: 'Atmospheric loop intro'
      cta: 'Save if this hits'
      hashtag_set: 'neo-soul-intermediate' # FK into hashtags.yaml
    stories: ['poll:song-request', 'this-or-that:gear', 'progress-checkin']
    notes: 'Pin top comment by 19:00'
```

### `songs.yaml`

```yaml
- id: 'wish-you-were-here'
  title: 'Wish You Were Here'
  artist: 'Pink Floyd'
  difficulty: 'intermediate'
  capo: 0
  tuning: 'EADGBE' # standard
  duration_sec: 45
  vibe_tags: ['atmospheric', 'melancholy']
  status: 'performed' # performed | scheduled | candidate
  best_views: 697
  source:
    type: 'ultimate-guitar'
    url: 'https://tabs.ultimate-guitar.com/...'
    fetched_at: 2026-04-21
- id: 'jolene'
  title: 'Jolene'
  artist: 'Dolly Parton (Beyoncé arr.)'
  difficulty: 'intermediate'
  capo: 4
  vibe_tags: ['raw', 'emotional']
  status: 'scheduled'
```

#### Embedded tabs (Ultimate Guitar–compatible)

Tabs are stored verbatim as multi-line strings, indexed by figure label, so they round-trip cleanly to/from Ultimate Guitar. Tuning is captured per-song (high-to-low, top-of-tab string ordering) so a renderer can label rows correctly.

```yaml
- id: 'atmospheric-loop-1'
  title: 'Atmospheric Loop (Original)'
  artist: 'JustMeAndGuitars'
  difficulty: 'intermediate'
  tuning: 'D#A#F#C#G#D#' # 1.5 steps down, drop tuning; rows top-to-bottom
  capo: 0
  status: 'scheduled'
  tabs:
    - label: 'Fig 1'
      bars: 2
      content: |
        D#|-----------------------------------|--------------------------------|
        A#|-----------------------------------|--------------------------------|
        F#|---6---8---6--------6---8---6------|----------6---------------6---9-|
        C#|---------------9----------------9--|--7---6-------9---7---6---------|
        G#|-7---7---7---7----7---7---7---7----|--------7---7-----------7---7---|
        D#|-----------------------------------|-9--9-----------9---9-----------|
    - label: 'Fig 2'
      bars: 1
      content: |
        D#|--------------------------------|
        A#|--------------------------------|
        F#|---6---8---9--------------------|
        C#|--------------9---9---6---9---6-|
        G#|-7---7---7--7---7---7---7---7---|
        D#|--------------------------------|
```

**Schema rules**

- `tuning`: 6 pitches concatenated, **high string first** (matches the order Ultimate Guitar prints — top row of the tab is the highest-pitched string). Sharps as `#`, flats as `b`. A string note may be 1–2 chars, so a parser must consume known note tokens (`A#`, `Bb`, `C`, …) rather than assume one char per string.
- `tabs[*].content`: YAML literal block (`|`) — preserves alignment and the trailing newlines that Ultimate Guitar relies on. Never reflow whitespace.
- `tabs[*].bars`: declared, not inferred. Used by the validator to assert the number of `|` separators per row matches.
- Validator must check: row count == tuning length, all rows in a figure are the same character width, every row starts with a string label that matches `tuning`.
- Renderer (xlsx generator) writes each figure into its own merged cell with a monospace font so columns line up.

**Why store the tab as raw text rather than parsed events?**

Two-way fidelity with Ultimate Guitar matters more than queryability. A structured representation (note + duration + position) loses bends, slides, palm mutes, and timing hints the moment the source format adds a glyph the schema didn't anticipate. Round-tripping the raw block preserves whatever Ultimate Guitar emitted; structured analysis can be a separate derived layer if/when it's needed.

### `hashtags.yaml`

```yaml
sets:
  neo-soul-intermediate:
    broad: ['GuitarTikTok', 'Musician']
    niche: ['NeoSoulGuitar', 'IntermediateGuitar', 'GuitarTutorial']
    community: ['JustMeAndGuitars', '30DayAestheticProgress']
  classic-rock:
    broad: ['GuitarTikTok', 'ClassicRock']
    niche: ['FingerstyleGuitar', 'AcousticCover']
    community: ['JustMeAndGuitars']
```

### `stories.yaml`

```yaml
templates:
  - id: 'poll:song-request'
    type: 'poll'
    prompt: 'Which one next?'
    options_source: 'songs.yaml#status=candidate'
  - id: 'this-or-that:gear'
    type: 'this-or-that'
    pairs: [['Strat', 'Tele'], ['Reverb', 'Delay']]
  - id: 'progress-checkin'
    type: 'open-question'
    prompt: 'What are you practicing today?'
```

### `performance.yaml`

```yaml
videos:
  - posted_at: 2026-04-21T19:30:00
    song_id: 'wish-you-were-here'
    views: 697
    likes: 84
    comments: 12
    saves: 31
    shares: 4
    follows_attributed: 6
```

### `collaborations.yaml`, `equipment.yaml`

Plain lists; one record per entry. Schema lifted from current sheets when migrating.

## Generator contract

`scripts/build_plan.py --content content/ --out JustMeAndGuitar_ENHANCED_Plan_May2026.xlsx`

- Pure function: same inputs → byte-identical xlsx (use `openpyxl` deterministically; sort dict keys; pin styles).
- Validates FKs (`song_id`, `hashtag_set`) before writing.
- Errors loudly on schema drift.

## Migration plan

1. Write a one-shot `scripts/extract_xlsx_to_yaml.py` that reads the current workbook and emits the YAML files above. Manual cleanup pass.
2. Land the generator (`build_plan.py`). Verify the regenerated xlsx matches the strategy content (visual check, not byte-equality on first pass).
3. Add a pre-commit-style guard: if `content/` changed, regenerate and stage the xlsx.
4. Then, and only then, mark the YAML as the source of truth and stop hand-editing the spreadsheet.
