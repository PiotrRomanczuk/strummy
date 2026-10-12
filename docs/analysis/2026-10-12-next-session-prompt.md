# Prompt for the next session — close the core-flows work and ship main

**Date**: 2026-10-12
**Use**: paste the block below as the first message of a fresh Claude Code session opened in `/Users/piotr/Desktop/MainCV/strummy`.
**Previous prompt**: `docs/analysis/2026-10-11-next-session-prompt.md` (executed 2026-10-11/12; this one continues it).

---

```
Kontekst: Strummy, brak aktywnych użytkowników. Sesja 2026-10-11/12 wykonała poprzedni prompt:
#850/#851 zmergowane, trzy blokery naprawione (#852 novice, #853 eskalacja w saveOnboarding,
#854 okno przypomnień + kolejka po producentach), proces uproszczony do jednej gałęzi (#855:
main → Vercel, job „Core flows” na każdym PR, husky + lint-staged, harmonogramy wyłączone,
Bruno/knip/Lighthouse za etykietą `extended-ci`), a każde TODO/NOT BUILT w tests/flows zamienione
w prawdziwy test: 40/40 kroków F01–F11 zielonych lokalnie. Wszystkie „cheapest wins” wysłane
(#859, #863, #867, #868, #869, #870). Ochrona `main`: strict=false, wymagane checki + „Core flows
(Desktop Chrome)”. Migracje 20261011170000 (RPC entity) i 20261011171500 (trigger lekcji) są na
dev i na prod.

Przeczytaj przed zmianami:
1. tests/flows/README.md — stan 40/40, wymóg Mailpit dla kroków mailowych, Open questions 1–6.
2. docs/analysis/2026-10-12-pr-analysis (brak pliku — streszczenie: PR-y małe i opisane; koszt
   dnia to strict=true + jeden runner; dwa hotfixy speców po merge’ach bez pełnego E2E; stos
   PR-ów wymagał 3× rebase; db-parity/migrations-replay czerwone z powodu ręcznych zmian na dev).
3. .github/workflows/README.md — co biega na PR, co za etykietą.

Stan wyjściowy — sprawdź na początku (`git fetch && gh pr list`), bo mogło się już zmergować:
- #873 F04.5 (recap mail; zawiera migrację triggera), #875 F05.6 (overdue mail + okno
  due-reminders), #876 F10.4 (mail z kolejki), #878 README 40/40, #879 pełne E2E dla
  app/ i components/. Wszystkie mają auto-merge; jeśli któryś jest DIRTY, przebazuj
  (`git rebase --onto origin/main <stara-baza>`), jeśli BEHIND — `gh pr update-branch`.
- Gałęzie lokalne do skasowania po merge: test/flows-*, feat/*, fix/*, docs/*, ci/*,
  tmp/flows-all, tmp/park. Worktree w .claude/worktrees/ zostaw (nie z tej sesji).
- Dev serwer :3101 może jeszcze działać: `pkill -f "next dev -p 3101"`.

Kolejność pracy:
A. Domknięcie merge’ów (powyżej). Potem jedno pełne `npm run test:flows` na main z
   `SMTP_HOST=192.168.1.75 SMTP_PORT=55325 SMTP_SECURE=false STUDENT_EMAILS_ENABLED=true`
   w środowisku procesu (serwer: `NODE_OPTIONS=--max-old-space-size=8192 npx next dev -p 3101`,
   config playwright.local-3101.config.ts — plik niewersjonowany, utwórz jak w README).
   Oczekiwane: 40 passed, 0 skipped. Bez tych zmiennych 4 kroki mailowe pomijają się celowo.
B. Zweryfikuj z właścicielem trzy kroki ręczne (nie wykonuj za niego, klasyfikator blokuje):
   1. env Mailpit w ~/.strummy-e2e/.env.local na uwh i w .env.local na Macu (bez GMAIL_*).
      Bez tego cztery kroki mailowe w „Core flows” raportują skip, a każdy inny test lub cron
      uruchomiony na runnerze wysyła prawdziwe maile przez Gmail (spam z 2026-10-11).
   2. Vercel → Settings → Git → Production Branch: `main`. Prod serwuje v0.174.0 (2026-09-14),
      285 commitów za main. Po przełączeniu zweryfikuj strummy.online (crony tylko na prod).
   3. STUDENT_EMAILS_ENABLED=true w Production na Vercel — dopiero przy pierwszych uczniach.
C. Sprzątanie CI, które dziś było szumem: po nałożeniu obu migracji na prod `db-parity` i
   `migrations-replay` powinny być zielone — jeśli nie, pobierz artefakt `schema-parity-diff`
   i napraw różnicę migracją, nigdy ręcznie.
D. Open questions 3–5 z README (parent portal poza zakresem — potwierdzić; raport aktywności
   jako strona /dashboard/admin/activity zamiast maili — odłożyć do pierwszych użytkowników;
   `inviteEmails` w onboardingu nauczyciela — usunąć pole albo dać ścieżkę shadow-invite).
   Każda decyzja = jeden mały PR z testem w tests/flows, jeśli dotyka produktu.
E. Na końcu: tabela w tests/flows/README.md odpowiada wynikowi z punktu A; wpis w
   ~/Obsidian/MainCV-Planner/projects/Strummy/Strummy.md (sekcja Now) zamykający pozycje
   „Core flows” jako done.

Zasady (bez zmian): jeden PR na przepływ, ≤500 linii, auto-merge, conventional commits bez
Co-Authored-By, PR body 3–5 linii po polsku; adminClient() tylko w beforeAll/afterAll, sprzątanie
po id; żaden test nie może wysłać prawdziwego maila (guard `isMailpitSmtpConfigured`); nie
edytuj plików .env ani nie zapisuj na prod — podaj właścicielowi komendy; nie twórz nowych
specy poza tests/flows; nie pisz raportów HTML ani audytów.

Zacznij od: `git fetch && git log --oneline origin/main -3 && gh pr list` i w 5 liniach zreferuj
stan, zanim cokolwiek zrobisz.
```
