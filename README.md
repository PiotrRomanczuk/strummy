# JMG Overlay App

Local web app for baking chord overlays into TikTok shorts.

## Workflow

1. Upload a vertical (9:16) video.
2. Paste a chord sheet from ultimate-guitar.com — the parser handles both `[Em]inline` and chord-line-above-lyric formats.
3. Play the video and tap **Space** on each chord change to stamp a marker. Drag pins on the timeline to nudge.
4. Per-chord voicing edits live in the **Chord voicings** panel (per-song; no global library yet).
5. Pick a variation: Clean Studio, Notebook & Tape, or Bold Chyron.
6. **Bake** → Puppeteer renders the React overlay to a transparent WebM, then ffmpeg composites onto the source and normalizes to TikTok-spec mp4.

## Requirements

- Node 20+
- `ffmpeg` and `ffprobe` on `PATH` (`brew install ffmpeg`)

## Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Layout

```
projects/<slug>/
  source.mp4          uploaded video
  project.json        all editor state
  overlay.webm        rendered overlay (after bake)
  output.mp4          final composited TikTok-ready video
```

## Out of scope (v2)

- Fingerstyle / tab mode
- Global chord library with per-song overrides
- Color / typography editing
- Auto-tempo / auto-chord detection
