# JustMeAndGuitars

Strategic planning workspace for the [@JustMeAndGuitars](https://www.tiktok.com/@JustMeAndGuitars) TikTok account. This repo holds the content strategy, calendar, and supporting scripts that drive a 0→1k follower growth push for May 2026.

## Layout

```
.
├── JustMeAndGuitar_ENHANCED_Plan_May2026.xlsx  # current source of truth (planned to be regenerated, not edited)
├── docs/superpowers/                           # design specs and implementation plans
├── overlays/                                   # static overlay assets and uploads for the TikTok overlay app
├── scripts/                                    # Python helpers for inspecting/updating the plan workbook
├── TODO.md                                     # active task checklist
└── GEMINI.md                                   # legacy project context (kept for compatibility)
```

The TikTok overlay web app lives in a sibling directory: `../justmeandguitars-overlay-app` (Next.js 16 + React 19). It is not part of this repository.

## Working with the plan spreadsheet

The `.xlsx` is currently the source of truth. Treat it as read-mostly — modifications should go through scripts so changes are reproducible.

```bash
python3 -m venv venv
source venv/bin/activate
pip install openpyxl

python scripts/dump_xlsx.py            # print all sheets as JSON
```

> **Roadmap:** migrate the plan content to versioned YAML/Markdown under `content/` and generate the workbook from those files. See `docs/superpowers/specs/` for the design rationale.

## Conventions

- Never edit a script's hardcoded path — pass the workbook path as a CLI argument.
- Don't commit the virtualenv, build artifacts, or `.DS_Store`. See `.gitignore`.
- Keep `TODO.md`, the plan, and the spec consistent — if a task ships, check it off in all three.
