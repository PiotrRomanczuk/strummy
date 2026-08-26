# My Music Staff vs Strummy — analiza konkurencyjna

**Data**: 2026-08-19
**Autor**: Piotr Romanczuk (przegląd MMS) + weryfikacja 1:1 przeciw kodowi
**Zakres**: pełne przejście przez app.mymusicstaff.com (konto trial, utworzony testowy
uczeń / wydarzenie / faktura) zestawione z faktycznym stanem repozytorium Strummy
**Metoda**: każde twierdzenie o Strummy jest sprawdzone w kodzie i wskazuje plik.
Twierdzenia o MMS pochodzą z przeglądu UI i nie były weryfikowane w ich kodzie.

---

## 0. Rama porównania (czytaj to najpierw)

To nie są produkty tej samej kategorii, a bez tego rozróżnienia całe zestawienie
wprowadza w błąd:

|                | My Music Staff                                | Strummy                                                            |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Model          | multi-tenant SaaS, per-seat                   | **jedno-nauczycielski CRM/LMS prowadzony przez właściciela**        |
| Cena           | $16.95 USD/mies. za nauczyciela, Stripe/PayPal | brak — nie istnieje ani cennik, ani subskrypcja, ani multi-tenancy |
| Etap           | dojrzały, płatny                              | pre-launch „trust pass" — cel: 5 realnych uczniów                   |
| Rdzeń wartości | back-office biznesu nauczyciela               | **pętla dydaktyczna**: lekcja → repertuar → zadania → postęp        |

Źródło ramy Strummy: `docs/app-blueprint/00-overview.md`.

**Konsekwencja**: znaczna część „braków" Strummy to nie zaległości, tylko świadomie
niezbudowany zakres. Poniżej rozdzielam to jawnie na trzy kategorie:

- **LUKA** — realny brak, który boli lub zaboli
- **CUT** — udokumentowana decyzja, żeby tego nie budować
- **PRZEWAGA** — Strummy ma to, a MMS nie

---

## 1. Odpowiedzi na osiem pytań porównawczych

### 1.1 Fakturowanie i płatności online — **LUKA (największa)**

W Strummy **nie ma niczego**: żadnej tabeli, migracji, schematu Zod, integracji
płatniczej. Grep po `invoice` / `stripe` / `payment` w `app/`, `lib/`, `components/`,
`supabase/`, `schemas/` nie zwraca ani jednej implementacji.

Jedyny ślad to uczciwy placeholder w portalu rodzica —
`components/dashboard/parent/ParentDashboard.Sidebar.tsx:90`:

> „Invoices and auto-pay are coming soon. For now your teacher handles billing directly."

MMS ma tu cały moduł: faktury (kreator 2-etapowy z zakresami dat), auto-invoicing,
pakiety przedpłacone, rejestr transakcji, wydatki + P&L, sales tax, kilometrówkę.

**To jest powód, dla którego nauczyciel płaci MMS $16.95/mies.** Dopóki Strummy nie
jest sprzedawany innym nauczycielom, brak jest bez znaczenia. W momencie gdy zaczyna
być — przestaje być opcjonalny.

### 1.2 Kalendarz i rezerwacja online — **CUT + częściowa LUKA**

`CAL-1` ma w blueprincie status **CUT** (decyzja z grill session 2026-07-18,
`docs/app-blueprint/02-lessons-calendar.md`):

> „Strummy gets no in-app visual calendar. **Google IS the calendar UI** — every lesson
> syncs there, and the single teacher lives in Google Calendar already."

Co jest: lista lekcji, dwukierunkowa synchronizacja z Google Calendar, wykrywanie
konfliktów, generowanie lekcji cyklicznych (`LES-3`, shipped).

Rezerwacja online **istnieje**, ale przez cal.com — `lib/services/calcom.ts`,
`app/api/webhooks/calcom/route.ts`, kolumna `lessons.calcom_booking_id`
(migracja `20260803090000`). To ścieżka intake'u nowego ucznia, nie samoobsługowa
zmiana terminu przez istniejącego.

Bez odpowiednika w Strummy: widok Month/Week/Day, „Temporary weekly hold"
(rezerwacja slotu na 7 dni do potwierdzenia), Public/Private visibility eventu,
make-up credits.

Uwaga na `CAL-4` (otwarta luka, Tranche 2): przycisk webhooka kalendarza jest
jednokierunkowy i przy ponownym kliknięciu tworzy zduplikowane kanały.

### 1.3 Dziennik ćwiczeń — **PRZEWAGA, która jest wyłączona**

Najciekawszy punkt całego zestawienia.

Strummy loguje sesję z czasem trwania, **tempem (`bpm_practiced`)**, notatką i
przypisaniem do konkretnego utworu (`components/practice/PracticeLogForm.tsx`,
`app/actions/practice.ts`, `schemas/PracticeSessionSchema.ts`). Wpisy są
niemutowalne z możliwością cofnięcia tego samego dnia, agregują się triggerami do
repertuaru (`PRA-1`, naprawione 2026-07-19), a nauczyciel dostaje wykres 14-dniowy
na karcie ucznia (`PRA-3`, shipped 2026-07-23).

MMS ma dni ćwiczone / godziny / średnią dziennie — **bez tempa i bez wiązania z
utworem**. Model danych Strummy jest tu bogatszy.

A mimo to — `lib/config/features.ts:42`:

```ts
export const SHOW_PRACTICE_FEATURES = false;
```

z komentarzem: *„Turned off 2026-07-31 — the feature did not earn its place in the
product."* Wyłączona jest cała powierzchnia: karta ćwiczeń rodzica, streak, minuty
tygodniowo, zakładka nauczyciela, wykres, badge zdrowia ucznia, karta „Needs
attention", kolumna minut w repertuarze.

**MMS buduje na dokładnie tej funkcji postrzeganą wartość dla płacącego rodzica.**
To jest mocny argument przeciw ocenie „did not earn its place" — koszt odwrócenia
decyzji to jedna linia, dane w `practice_sessions` są nietknięte, `/dashboard/practice`
nadal rozwiązuje się po bezpośrednim URL-u.

### 1.4 Frekwencja — **LUKA (najtańsza do zamknięcia)**

Słowo `attendance` występuje w całym repozytorium **raz**, w agencie AI
(`lib/ai/agents/analytics.ts`). Nie ma domeny frekwencji: ani procentu obecności, ani
statystyk 90-dniowych, ani raportu, ani widoku dla rodzica.

Dane źródłowe **już istnieją** — lekcje mają statusy. Brakuje wyłącznie agregatu i
powierzchni. MMS pokazuje to jako pierwszorzędny artefakt dla rodzica.

### 1.5 Portal rodzica — **jest, węższy, uczciwy**

Wdrożony 2026-07-23 (`components/dashboard/parent/`). Read-only widok **jednego**
powiązanego dziecka: notatka od nauczyciela, nadchodzące lekcje, karta ćwiczeń
(dziś ukryta flagą z 1.3), placeholder billingu.

MMS Student Portal jest szerszy: kalendarz, zasoby online, historia wiadomości,
per-kontakt kontrola widoczności. Różnica ilościowa, nie jakościowa — architektura
Strummy (flaga Parent + RLS) unosi resztę bez przebudowy.

### 1.6 Raportowanie biznesowe — **LUKA**

MMS: 13 gotowych raportów, w tym twarde metryki biznesowe (Student Retention Rate,
Sales Tax, Billable Hours, Family Balances).

Strummy:

- jeden endpoint eksportu: `app/api/exports/student/[id]/route.ts`
- `/dashboard/stats` renderuje literalnie „Coming soon"
- `song-stats`, `lesson-stats`, `my-stats`, `cohorts`, `health` siedzą w
  `CORE_LOOP_HIDDEN_ITEMS` (`components/navigation/menu.constants.ts:64`)
- `ADM-8` (otwarta): `/api/cohorts/analytics` **404-uje dla wszystkich** — autoryzuje
  po nieistniejącej kolumnie `profiles.role`

Raporty istnieją głównie jako skille agentowe (`student-export`, `progress-snapshot`),
czyli narzędzia właściciela, nie funkcja produktu.

### 1.7 Cennik — **nie istnieje jako decyzja**

Teza z przeglądu („płaska stawka jako przewaga nad per-seat") dotyczy produktu,
którego nie ma. W repo nie ma strony pricing, modelu subskrypcji ani multi-tenancy.

Istotniejsze: wielo-nauczycielskość jest dziś **zamaskowana** tym, że właściciel jest
jedynym nauczycielem i jednocześnie adminem. Blueprint (Tranche 2) trzyma cztery
otwarte luki, które wypłyną przy drugim nauczycielu:

| ID      | Problem                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| `ADM-5` | `/api/stats/weekly` bez role checka — każdy uczeń czyta liczby całego studia   |
| `ADM-6` | `/api/students/pipeline` bez role checka, bez konsumenta UI                    |
| `ADM-7` | `/api/students/needs-attention` bez role checka, martwy kod                    |
| `ASG-6` | Admin widzi tylko zadania, w których sam jest nauczycielem, nie wszystkie      |

### 1.8 Responsywność — **PRZEWAGA (udowodniona)**

Przegląd MMS notuje, że aplikacja nie skalowała się do wąskiego okna — treść i menu
nachodziły na siebie, wymagane było znaczne poszerzenie okna.

Strummy ma to przetestowane, nie zadeklarowane. `playwright.config.ts` definiuje
**10 projektów urządzeń**: Desktop Chrome / Firefox / Safari, iPhone SE (320px),
iPhone 12, iPhone 15 Pro Max, iPhone 17 Pro Max, Galaxy S8, iPad Pro, iPad gen 7.
Do tego reguła projektowa mobile-first z obowiązkowymi wariantami `dark:`
(`.claude/rules/code-style.md`).

---

## 2. Czego Strummy ma, a MMS nie ma wcale

Tego w oryginalnym przeglądzie nie ma, a to jest właściwa oś różnicowania — bo w
księgowości Strummy nie wygra i nie powinien próbować.

| Obszar                 | Strummy                                                                       | MMS |
| ---------------------- | ----------------------------------------------------------------------------- | --- |
| Asystent AI            | agenci (chat / analytics / communication), generatory maili, `ai_workflow_runs` | —   |
| Domena muzyczna        | trenażer gryfu, quiz akordów, archetypy progresji, sekcje utworów              | —   |
| Wzbogacanie danych     | Spotify, import tabów z Ultimate Guitar                                        | —   |
| Kurs teorii (LMS)      | `/dashboard/theory` — zbudowany, nav-hidden do czasu treści                    | —   |
| Ocena umiejętności     | domena skills: poziomy, roadmapa lekcji, checklista, ocena nauczyciela          | —   |
| Lokalizacja            | pełne PL + EN z bramką CI na kompletność (`pl.json` 82 kB vs `en.json` 76 kB)  | tylko EN |
| Kalendarz              | dwukierunkowy sync z Google Calendar                                           | gołe klucze API |

MMS ma za to moduły, których Strummy nie ma i **nie powinien mieć**: Lending Library,
Mileage Log, Sales Tax, kreator stron WWW. Dla nauczyciela jednego instrumentu bez
wypożyczalni to obciążenie UX, nie wartość — i to jest realna słabość MMS
(13 pozycji w menu bocznym).

---

## 3. Wnioski i rekomendacje

Trzy rzeczy, w tej kolejności:

### 3.1 Ponownie rozstrzygnąć `SHOW_PRACTICE_FEATURES`

Funkcja, którą MMS wykorzystuje jako główny dowód wartości dla płacącego rodzica,
została w Strummy zbudowana **głębiej** (BPM, wiązanie z utworem) i wyłączona jako
„nie zasłużyła na swoje miejsce". Ta ocena zapadła bez danych z realnego użycia —
flaga zgasła 2026-07-31, przed onboardingiem 5 uczniów.

Decyzja do podjęcia: włączyć przed launchem i ocenić na realnych danych, czy
utrzymać wyłączoną świadomie, z odnotowanym uzasadnieniem odpornym na ten raport.
Koszt odwrócenia: jedna linia w `lib/config/features.ts`.

### 3.2 Zbudować frekwencję

Największy stosunek wartości do kosztu w całym zestawieniu. Dane są w `lessons`,
brakuje agregatu i widoku. Domyka najbardziej widoczny brak wobec MMS w obszarze,
który rodzic rozumie natychmiast.

### 3.3 Rozstrzygnąć pytanie o produkt, zanim cokolwiek z ekonomii MMS zostanie skopiowane

- **Jeśli Strummy zostaje narzędziem jednego studia** — fakturowania nie budujemy
  nigdy, raport zamyka się na punkcie 3.2, a sekcje 1.1, 1.6 i 1.7 są bezprzedmiotowe.
- **Jeśli ma być SaaS** — kolejność jest odwrotna niż podpowiada intuicja: najpierw
  wracają cztery role guardy z 1.7 (`ADM-5/6/7`, `ASG-6`), bo dziś drugi nauczyciel
  czyta cudze dane, a dopiero potem fakturowanie. Bez tego pierwszy płacący klient
  jest incydentem bezpieczeństwa.

---

## Referencje

- `docs/app-blueprint/00-overview.md` — teza produktu, role, pętla rdzeniowa
- `docs/app-blueprint/02-lessons-calendar.md` — decyzja CAL-1 (CUT)
- `docs/app-blueprint/04-practice-progress.md` — domena ćwiczeń, PRA-1/2/3
- `docs/app-blueprint/90-roadmap.md` — Tranche 2, luki ADM-5…8 / ASG-6
- `lib/config/features.ts` — flagi widoczności funkcji
- `components/navigation/menu.constants.ts` — `CORE_LOOP_HIDDEN_ITEMS`
- `playwright.config.ts` — macierz urządzeń
