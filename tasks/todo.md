# Nagranie → lekcja (Wispr Flow → Strummy)

_2026-10-14_ · branch `feature/lesson-transcripts` · blueprint CNT-5/6/8

## Etap 1 — Strummy przyjmuje transkrypt

- [ ] migracja `lesson_transcripts` (+ enum `transcript_source`), RLS teacher/admin only
- [ ] `lib/services/lesson-transcripts.ts` — uczeń po e-mailu, lekcja ±90 min lub tworzona, upsert po `external_id`
- [ ] `POST /api/transcripts/ingest` (withApiAuth, teacher|admin, Zod)
- [ ] karta „Transkrypcja” na detalu lekcji (desktop + mobile, canEdit only)
- [ ] testy: service, route, RLS
- [ ] blueprint: CNT-5 shipped, data model; raport manual-tests

## Etap 2 — szkic z nagrania

- [ ] agent `transcript-lesson-draft` (Zod structured output) — Ollama przez OpenAI-compatible `/v1`
- [ ] dopasowanie utworów `find_similar_songs` (≥0.6 ok / <0.6 wybór / brak → nowy)
- [ ] `ai_workflow_runs` stan `awaiting_review`
- [ ] karta „Szkic z nagrania”: akceptuj → `lessons.notes`, `lesson_songs`, `quickAssignSongFromLesson`, plan następnej lekcji
- [ ] decyzja infra: Vercel → Ollama (tunel Cloudflare z service tokenem) albo generowanie poza Vercel

## Etap 3 — glue

- [x] skill `.claude/skills/lesson-ingest/SKILL.md`
- [ ] klucz API teacher w `/dashboard/settings`
- [ ] pierwszy run: 8.10 (Michał), 12.10 (Quentin)
- [ ] po tygodniu: rutyna `/schedule` codziennie 22:00

## Review

(uzupełnić po zakończeniu)
