# Prompt for the next session — bring the core flows to green

**Date**: 2026-10-11
**Use**: paste the block below as the first message of a fresh Claude Code session opened in `/Users/piotr/Desktop/MainCV/strummy`.

---

```
Kontekst: Strummy nie ma jeszcze aktywnych użytkowników. Jedynym celem jest doprowadzenie
"podstawowej pełnej funkcjonalności" do stanu, w którym każdy przepływ działa od końca do
końca, a dowodem jest zielony test w tests/flows/. Nie optymalizuj niczego innego.

Przeczytaj po kolei, zanim cokolwiek zmienisz:
1. tests/flows/README.md — definicja zakresu (F01–F11), trzy stany testu, trzy blokery,
   lista "cheapest wins". To jest jedyne źródło prawdy o postępie.
2. docs/audits/2026-10-11-e2e-functional-coverage-audit.md — co jest zbudowane, co nie,
   per ekran; sekcja "Follow-up" mówi, co już naprawiono.
3. docs/analysis/2026-10-11-development-process-audit.md — dlaczego proces ma być
   minimalny; sekcja 6 (co zmienić) i decyzja właściciela: jedna gałąź main → Vercel,
   pociąg wydań wyłączony, nocne E2E/Lighthouse/Bruno/knip wyłączone, @smoke na PR.
4. docs/audits/2026-10-11-e2e-prod-safety-audit.md — tylko sekcja "Infrastructure
   findings"; guard prod jest już wdrożony w PR #850.
5. design-mockups/STATUS.md — jak ma wyglądać każdy ekran (tylko gdy dotykasz UI).

Stan wyjściowy: gałęzie fix/e2e-prod-safety (#850) i fix/e2e-audit-findings (#851) są
wypchnięte i czekają na merge. Zacznij od zmergowania #850, potem #851 (retarget na main).
Potem pracuj na krótkich gałęziach od main, jeden przepływ na PR, PR ≤ 500 linii,
auto-merge na zielonym CI.

Kolejność pracy (nie zmieniaj jej):
A. Trzy blokery z README, każdy osobny PR z testem jednostkowym:
   A1. SKILL_LEVELS += 'novice' (schemas/StudentIntakeSchema.ts) — odblokowuje F02.5, F11.4.
   A2. saveOnboarding odrzuca wywołanie, gdy caller ma już jakąkolwiek rolę
       (app/actions/onboarding.ts) — eskalacja uprawnień.
   A3. Przypomnienia: okno 24h liczone od "następnego przebiegu", processor kolejki po
       enqueue (nie równolegle), cron co godzinę w vercel.json, STUDENT_EMAILS_ENABLED
       udokumentowane w .env.example — odblokowuje F03.4, F05.6, F10.4.
B. Proces do minimum (jeden PR, tylko konfiguracja):
   wyłącz release-train.yml i nightly-e2e.yml (schedule: usuń, zostaw workflow_dispatch),
   Lighthouse/Bruno/knip za etykietę `extended-ci`, w e2e.yml dodaj job uruchamiający
   `npm run test:flows` na KAŻDYM PR (Desktop Chrome, self-hosted), napraw hooki
   (git config core.hooksPath .husky + skrypt prepare; pre-commit = lint-staged +
   jest --findRelatedTests; usuń pre-push). W CONTRIBUTING.md i CLAUDE.md zostaw jeden
   model wdrożeń: main → Vercel. Usuń .github/{instructions,agents,copilot-instructions.md,
   ENGINEERING.md,*.backup}.
C. tests/flows — dla każdego kroku `test.skip(true, 'TODO automate: …')` napisz prawdziwy
   test: otwórz wskazany istniejący spec, skopiuj działające selektory, usuń skip, uruchom
   `npm run test:flows -- --grep Fxx` na dev stacku (serwer: NODE_OPTIONS=... npx next dev
   -p 3101, config playwright.local-3101.config.ts; porty 3000/3100 zajmują inne projekty).
   Zielony = commit. Czerwony z powodu produktu = napraw produkt w tym samym PR.
D. tests/flows — dla każdego `test.fixme(true, 'NOT BUILT: …')` zbuduj brakującą rzecz,
   najtańsze najpierw (lista "cheapest wins" w README): invite teacher w UI, auto-invite
   przy tworzeniu ucznia, onboarding ucznia po claim, Skills w nawigacji nauczyciela,
   logs/import-logs dla admina, assignment_completed trigger. Każda zamienia fixme w test.
E. Dopiero gdy F01–F11 są zielone bez skipów i fixme: aktualizacja tests/flows/README.md
   (tabela stanu) i wpis w ~/Obsidian/MainCV-Planner/projects/Strummy/Strummy.md.

Zasady:
- Przed każdą zmianą produktu: czy istnieje test w tests/flows, który ją wymusza? Jeśli nie,
  najpierw napisz test (czerwony), potem zmianę.
- Nie dodawaj nowych specy poza tests/flows. Stare 92 specy w tests/e2e zostają jako
  regresja ekranów; uruchamiaj tylko ten, którego ekran dotykasz.
- Nie pisz raportów HTML ani nowych audytów. Wynik `npm run test:flows` jest raportem.
- adminClient() w testach tylko w beforeAll/afterAll, sprzątanie po id. Nigdy `if (count>0)`.
- Nie twórz ani nie modyfikuj agentów, skilli, reguł w .claude/ poza jedną zmianą z punktu B.
- Commit: conventional commits, bez linii Co-Authored-By. PR body: 3–5 linii po polsku, co
  działa teraz, czego nie działało.
- Jeśli coś wymaga decyzji właściciela (np. czy parent portal wchodzi w zakres), zapisz
  pytanie w tests/flows/README.md pod "Open questions" i idź dalej z następnym krokiem.

Zacznij od: `git fetch && git log --oneline origin/main -3 && gh pr list` i zreferuj w 5
liniach, co widzisz, zanim cokolwiek zrobisz.
```
