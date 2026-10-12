# Strummy → Podium — plan solo-founder SaaS

**Data**: 2026-09-06
**Zakres**: cel 20k PLN/mies., rynek globalny, rebranding, plan 6 miesięcy, kanały
pozyskiwania klientów
**Status**: plan strategiczny (nie decyzja produktowa) + weryfikacja jednego punktu
technicznego przeciw kodowi — sekcja 9

> Konwencja `docs/analysis/`: każde twierdzenie o Strummy jest sprawdzone w kodzie i
> wskazuje plik. Sekcje 1–8 to strategia i szacunki rynkowe (nieweryfikowalne w
> repozytorium — traktuj jako założenia). Sekcja 9 jest weryfikowalna i została
> zweryfikowana.

---

## 1. Cel i skala

- **20 000 PLN/mies. przychodu** — nie multimilionowy biznes.
- ⚠️ Jeśli 20k ma być **na rękę**, celuj raczej w ~30k przychodu (ryczałt 12% +
  składka zdrowotna + ZUS + koszty infry zjadają ~35%).
- **Rynek globalny** (angielski C1), nie tylko Polska — arbitraż cenowy działa na
  korzyść: polska szkoła płaci 199 zł z bólem, amerykańska płaci Opus1 $98–325 bez
  mrugnięcia.
- 20k PLN ≈ $5k MRR = **60–80 klientów** przy ARPU $60–80.

---

## 2. Kluczowe ustalenia strategiczne

### 2.1 Rynek nie jest ograniczeniem — dystrybucja jest

Nawet konserwatywne szacunki: ~300 „biznesowych" nauczycieli gitary w Polsce,
8–18 tys. w USA. Potrzebujesz 60–80 klientów globalnie — to ułamek promila rynku.

### 2.2 Cena ważniejsza niż liczba klientów

| Średni abonament | Ilu klientów na cel |
| ---------------- | ------------------- |
| 150 zł           | 133 (nierealne solo) |
| 250 zł           | 80                  |
| **400 zł**       | **50 (realne)**     |

Do tego: płatne wdrożenia jednorazowe (1,5–3k zł za migrację + konfigurację).

### 2.3 Gitarzyści = dobry kanał, zły ICP

Mniej strukturalni, wyższa rotacja uczniów, niższa monetyzacja. Lepszy target
długoterminowo: **studia fortepianowe/wieloinstrumentowe** z ustalonym semestrem —
mają procesy i już płacą za narzędzia. Gitara zostaje drogą wejścia (masz tam
wiarygodność), nie segmentem docelowym.

### 2.4 Produkt jest instrumentalnie neutralny

Grafik, obecności, płatności, komunikacja z rodzicami działają identycznie dla
każdego instrumentu. To nie wymaga pivotu technicznego — tylko zmiany
komunikacji/copy. Segmentację robi się przekazem, nie nazwą czy kodem.

---

## 3. Nazwa: Strummy → Podium

**Podium** wygrało jako neutralne instrumentalnie, przetrwa ewentualne wyjście poza
muzykę (szkoły językowe, taneczne), działa dobrze i po polsku, i po angielsku.

**Rekomendacja: zmień nazwę TERAZ, nie po becie.**

- Rebranding kasuje SEO, backlinki, wzmianki w grupach, rozpoznawalność — dokładnie
  wtedy, gdy zaczynają pracować.
- Segmentację (uderzanie w gitarzystów) robisz przekazem i kanałem, nie nazwą —
  możesz komunikować się gitarowo pod neutralną nazwą.
- Koszt zmiany teraz (3 uczniów) = jeden wieczór. Koszt zmiany za pół roku =
  utracony kwartał złożonego procentu.

⚠️ Do weryfikacji przed przywiązaniem się: dostępność domen, czystość rejestrowa w
UPRP/EUIPO/USPTO.

---

## 4. Twardy fakt, który zmienił plan

**MVP działa, twoi uczniowie z niego korzystają — ale to nie jest walidacja.**
Używają, bo prosisz. Prawdziwy test: **obca szkoła, która sama się zarejestruje i
sama zapłaci**, bez twojej sieci kontaktów.

---

## 5. Plan 6 miesięcy

| Miesiąc                | Fokus                                                                                       | Cel                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| **1 (wrzesień)**       | 30 rozmów + ręczne wdrożenie 3 obcych szkół                                                 | 3 obce szkoły używają tygodniowo       |
| **2 (październik)**    | Naprawy po pierwszych obcych, kolejne 3–5 wdrożeń                                           | 6–8 szkół, pierwsze płatności          |
| **3 (listopad)**       | Self-serve + płatności (Stripe/Paddle) + docs + bot RAG                                     | Rejestracja działa bez ciebie          |
| **4 (grudzień)**       | Prawo: regulamin, polityka prywatności, DPA, ⚠️ COPPA. Przygotowanie kampanii styczniowej   | Gotowość na skok sprzedażowy           |
| **5 (styczeń)**        | **Okno: nowy semestr/rok. Cała energia w sprzedaż**                                          | 12–18 płacących                        |
| **6 (luty)**           | Skalowanie tego, co zadziałało                                                               | 18–28 płacących                        |

### Bramki kill/continue

- **Tydzień 4:** 3 obce szkoły logują się bez przypominania.
- **Miesiąc 3:** ≥1 obcy klient płaci.
- **Miesiąc 6:** ≥15 płacących, w tym **≥5 spoza twojej sieci kontaktów**,
  churn <5%.

⚠️ 6 miesięcy full-time = 6 miesięcy runway. Bez niego rób to na pół etatu i przesuń
bramki o 2–3 miesiące.

---

## 6. Trzy rzeczy na ten tydzień

1. **Wdroż jedną obcą szkołę** — dziś, ręcznie, za darmo, z umową pilotażową.
2. **Sprawdź izolację tenantów (RLS w Supabase)** — zanim dane obcej szkoły znajdą
   się obok twoich. Jedyna rzecz techniczna, która nie może czekać.
   → **sprawdzone, sekcja 9. Izolacji nie ma i punkt 1 na niej stoi.**
3. **Postaw landing z formularzem „poproś o dostęp"** — nawet brzydki.

---

## 7. Pozyskiwanie klientów

### 7.1 Kolejność kanałów

Znajomi (dziś) → ich polecenia (pytaj o 2 osoby na końcu każdej rozmowy) → grupy FB /
Reddit → cold mail (dopiero na końcu).

### 7.2 Mail otwiera, rozmowa dostarcza wartość

- Cold mail konwertuje 1–3% → 30 rozmów wymaga 1000–3000 maili.
- Twoja sieć w środowisku gitarowym konwertuje kilkadziesiąt procent — to twoja
  jedyna realna przewaga nad My Music Staff / Opus1.
- Telefon pomiń: gorszy jako otwieracz niż mail, prawnie kłopotliwy przy cold
  outreach w wielu krajach.
- Format maila: krótki, bez oferty — „uczę gitary, zbudowałem narzędzie do grafiku i
  płatności, pokażę w 15 min i zapytam, co u ciebie nie działa?"

### 7.3 Społeczności — plan 4 tygodni

Podział wysiłku: **70% Facebook**, 20% Reddit (r/musiceducation ~3k członków, cienko,
ale żywy temat), 10% nisze (podcast Guitar Teaching Business, Become A Music Teacher).

| Tydzień | Działanie                                                                    |
| ------- | ---------------------------------------------------------------------------- |
| 1       | Dołącz do 8–10 grup. Tylko komentuj (merytorycznie o grze, nie o produkcie)  |
| 2       | Pierwszy post problemowy w 2–3 grupach. Zero produktu, zero linku            |
| 3       | Kolejne posty, DM-y do osób, które komentowały konkretnie                    |
| 4       | Dopiero w DM: „zbudowałem coś na ten problem, pokażę?"                        |

**Posty, które działają lepiej niż pytanie wprost:**

- _Pytanie o czas:_ „Ile godzin tygodniowo zajmuje wam administracja — grafik,
  przypomnienia, płatności?"
- _Własna porażka:_ „Trzeci raz w tym miesiącu przegapiłem niezapłaconą lekcję. Jak
  to ogarniacie?"
- _Fałszywy wybór:_ „Excel czy Kalendarz Google — co przetrwało dłużej?" (prawdziwa
  odpowiedź: żadne — sami to napiszą)

**Sygnał ostrzegawczy:** posty z <5 komentarzami po 2 tygodniach = problem nie boli
tak, jak myślisz. Lepiej wiedzieć to w październiku niż w styczniu.

---

## 8. Narzędzia (Claude plugins)

**Włącz (5):** Gmail, Google Calendar, GitHub, Stripe (⚠️ rozważ Paddle jako Merchant
of Record przy global — rozstrzygnij przed grudniem, przepinanie po pierwszych
klientach boli), jedno narzędzie do notatek z rozmów (Granola/Fathom/Otter — wybierz
jedno).

**Świadomie wyłącz:** Lovable, Replit — budowanie _czuje się_ produktywnie i zjada
godziny należne rozmowom ze szkołami. Wideo-narzędzia (Runway, VEED, Higgsfield,
Riverside) — wróć do nich w miesiącu 4 przy content marketingu.

---

## 9. Izolacja tenantów — stan faktyczny (sprawdzone w kodzie 2026-09-06)

Punkt 6.2 mówi „sprawdź, zanim dane obcej szkoły znajdą się obok twoich". Sprawdzone.
**Izolacji tenantów nie ma — nie dlatego, że RLS jest zepsute, tylko dlatego, że RLS
jest _rolowe_, nie _tenantowe_.** To jest zgodne z udokumentowaną ramą produktu
(„jedno-nauczycielski CRM prowadzony przez właściciela",
`docs/analysis/2026-08-19-mymusicstaff-competitive-analysis.md` §0) i przestaje być
zgodne dokładnie w dniu, w którym wchodzi obca szkoła.

### 9.1 Nie istnieje żadna kolumna tenanta

Grep po `org_id|organization_id|tenant_id|school_id|studio_id` w
`supabase/migrations/*.sql` i `database.types.ts` nie zwraca **ani jednego trafienia**.
Wszystkie 14 tabel `public.*` są scope'owane wyłącznie przez `profiles.id` i flagi ról
(`is_admin`, `is_teacher`, `is_student`) —
`supabase/migrations/20260718090100_profiles.sql:43-61`.

### 9.2 Co konkretnie przecieka między szkołami

| Tabela              | Polityka                                                                       | Skutek przy dwóch szkołach                                                 |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `profiles`          | `profiles_select_staff` — `using (public.is_admin_or_teacher())`               | **Każdy nauczyciel czyta profile wszystkich uczniów, także cudzych**       |
| `songs`             | `songs_select_active` — `using (deleted_at is null or public.is_admin())`      | Każdy zalogowany czyta całą bibliotekę utworów, niezależnie od szkoły       |
| `songs`             | `songs_update_staff` / `songs_delete_staff` — `public.is_admin_or_teacher()`   | **Obcy nauczyciel może edytować i usuwać twoje utwory**                     |
| `teacher_settings`  | `teacher_settings_select` — `is_admin() or is_teacher() or własny profil`      | Każdy nauczyciel czyta ustawienia studia każdego innego nauczyciela         |
| `lessons`           | `lessons_select_participant` — admin **lub** `teacher_id`/`student_id` = swój  | ✅ poprawnie scope'owane per uczestnik (IDOR-fix już wbudowany)             |
| `assignments`       | `assignments_select_participant` — jw.                                          | ✅ poprawnie scope'owane per uczestnik                                      |

Cytaty:
`supabase/migrations/20260718090300_lessons.sql:91-126`,
`supabase/migrations/20260718090200_songs.sql:43-62`,
`supabase/migrations/20260718090500_assignments.sql:54-76`,
`supabase/migrations/20260723130000_teacher_settings_and_daily_goal.sql:78-97`.

Warto podkreślić, że to **nie jest niedopatrzenie** — migracja mówi to wprost
(`20260718090300_lessons.sql:117-121`):

> „MINIMAL SIMPLIFICATION: this lets any teacher read all profiles. Acceptable for the
> single-teacher CRM; when multi-teacher / per-teacher student scoping lands, narrow
> this to «students this teacher actually teaches»."

Ten dzień właśnie nadszedł.

### 9.3 Drugi problem: `is_admin()` to globalny superuser

W obecnym modelu właściciel studia jest **adminem**, nie nauczycielem
(`supabase/migrations/20260727150000_profiles_select_lesson_teacher.sql` mówi to wprost:
„the studio owner is an ADMIN who teaches"). `public.is_admin()` nie ma żadnego
scope'u — pojawia się w politykach SELECT/UPDATE/DELETE praktycznie każdej tabeli.
Jeśli obca szkoła dostanie rolę właściciela na tym samym modelu, dostanie **całą
bazę**. Jeśli nie dostanie, będzie „teacherem" i nie będzie mogła zarządzać własnymi
nauczycielami.

**Nie ma bezpiecznej konfiguracji ról dla drugiej szkoły na obecnym schemacie.**

### 9.4 Konsekwencja dla planu

Punkt 6.1 („wdroż jedną obcą szkołę dziś, ręcznie") jest wykonalny **tylko** w jednym
z dwóch wariantów — wybór przed pierwszym wdrożeniem, nie po:

- **A. Osobny stack per pilot** (osobny projekt Supabase + deployment na szkołę).
  Zero pracy schematowej, izolacja fizyczna i pełna. Skaluje się do ~5 szkół zanim
  utrzymanie zacznie boleć. **Rekomendacja na miesiąc 1–2** — kupuje czas na rozmowy
  zamiast wydawać go na migrację schematu przed pierwszą walidacją.
- **B. Prawdziwy multi-tenant** — `organizations`, `organization_id` na każdej tabeli,
  `public.current_org_id()` obok `current_profile_id()`, przepisanie wszystkich
  polityk z rolowych na `role AND org`, rozbicie `is_admin()` na `is_platform_admin()`
  (ty) i `is_org_owner()` (klient). To tydzień–dwa pracy plus przepisanie suity RLS
  (`npm run test:rls`) — czyli miesiąc 3 z planu, razem z self-serve, nie wcześniej.

Czego **nie** robić: wpuścić obcą szkołę na wspólny stack „na chwilę". Punkt 9.2
mówi, że obcy nauczyciel może wtedy usunąć twoje utwory i przeczytać dane twoich
uczniów — a to jest incydent RODO, nie usterka.

---

## 10. Ryzyka i do weryfikacji ⚠️

- **COPPA** (dzieci <13 w USA) — osobny reżim prawny, potrzebny prawnik US ed-tech,
  nie tylko RODO.
- Dane dzieci nie mogą trafiać do zewnętrznego API (Anthropic/OpenAI) bez podstawy
  prawnej — modele lokalne lub anonimizacja.
- **KSeF** obowiązkowy od 1.04.2026 dla JDG.
- **VAT:** usługi edukacyjne zwolnione — twoi klienci i tak nie odliczą VAT-u, więc
  rejestracja VAT to czysty koszt dla nich.
- **Churn** przy 50 klientach: 5%/mies. = bieżnia, nie wzrost.
- **Support jako pułapka czasowa** — 50 szkół bez self-service i bota RAG to pełny
  etat w samym supporcie.
- **Brak modułu płatności/faktur** — potwierdzone w analizie konkurencyjnej
  (`2026-08-19-mymusicstaff-competitive-analysis.md` §1.1: „w Strummy nie ma niczego,
  żadnej tabeli, migracji, schematu Zod, integracji płatniczej"). Miesiąc 3 planu
  zakłada zbudowanie tego od zera — to nie jest integracja Stripe'a na wieczór.
- Przepisy podatkowe, KSeF, AI Act, COPPA zmieniają się najczęściej — potwierdź u
  prawnika/księgowej przed wdrożeniem.
