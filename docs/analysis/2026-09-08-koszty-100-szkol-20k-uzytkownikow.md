# Koszty serwera i utrzymania — 100 szkół / 20 000 aktywnych użytkowników

**Data**: 2026-09-08
**Zakres**: modelowanie kosztów infrastruktury i utrzymania Strummy w skali
100 szkół muzycznych i 20 000 MAU.
**Metoda**: wolumeny wyprowadzone z rzeczywistego kodu (cron dispatcher, kolejka
powiadomień, warstwa AI, storage, realtime), ceny z cenników dostawców
zweryfikowanych 2026-09-08. Każde założenie jest jawne i podmienialne.

---

## 0. Odpowiedź w jednym akapicie

**~$215/mies.**, czyli **$2,15 na szkołę** albo **$0,011 na aktywnego
użytkownika**. Rachunek „z domyślnych ustawień" wychodzi $930 — ale to nie jest
koszt tej skali, tylko koszt czterech nieprzemyślanych decyzji (§ 3). Ruch przy
20 000 MAU to **3,3 requesta na sekundę średnio**; to jest małe obciążenie i
rachunek powinien to odzwierciedlać.

Droga część nie jest w dolarach: **~40 h/mies. utrzymania** (§ 6) kosztuje 10×
więcej niż serwery. A przed tym wszystkim stoją **dwa blokery w kodzie**, przez
które ten scenariusz dziś fizycznie nie ruszy (§ 7) — one są ważniejsze niż cała
reszta tego dokumentu.

| Wariant                                     | Infra/mies. | Na szkołę | Czas/mies. |
| ------------------------------------------- | ----------: | --------: | ---------: |
| Managed „z domyślnych"                      |        $930 |     $9,30 |      ~40 h |
| **Managed dostrojony** ← rekomendacja       |    **$215** | **$2,15** |      ~40 h |
| Podłoga (Cloudflare + Hetzner, self-hosted) |         $85 |     $0,85 |      ~60 h |

Zejście z $930 na $215 to **~12 h jednorazowej pracy i $8 600 oszczędności
rocznie**. Zejście z $215 na $85 to migracja obarczona realnym ryzykiem, która
oszczędza $130/mies. kosztem 20 h/mies. — czyli **$6,50 za godzinę Twojej
pracy**. Pierwsze warto zrobić od razu, drugiego nie warto wcale.

---

## 1. Założenia (i skąd się biorą)

### 1.1 Kształt bazy użytkowników

100 szkół × 200 użytkowników = 20 000 MAU, w podziale:

| Rola        |     Liczba | Sesji/mies. | Requestów/sesję | Requestów/mies. |
| ----------- | ---------: | ----------: | --------------: | --------------: |
| Uczniowie   |     17 900 |          12 |              20 |           4,3 M |
| Nauczyciele |      2 000 |          22 |              90 |           4,0 M |
| Admini      |        100 |          20 |             120 |          0,24 M |
| **Razem**   | **20 000** |             |                 |      **~8,5 M** |

Nauczyciel generuje ~10× ruch ucznia — to on siedzi w dashboardzie, listach
uczniów i agregatach. Przy 20 nauczycielach na szkołę **to nauczyciele, a nie
uczniowie, są głównym kosztem compute i egressu.**

**Kluczowa liczba dla całej wyceny**: 8,5 M requestów/mies. ÷ 2,59 M sekund =
**3,3 req/s średnio**, przy szczycie wieczornym rzędu 30–35 req/s. To jest ruch,
który obsługuje jeden mały Postgres i jedna mała instancja Node'a. Każda wycena,
która sugeruje inaczej, jest wyceną strachu, nie obciążenia.

Odsłon stron: ~2,4 M/mies.

### 1.2 Wolumeny wyprowadzone z kodu

| Zjawisko                 |         Wolumen/mies. | Źródło w kodzie                                                                   |
| ------------------------ | --------------------: | --------------------------------------------------------------------------------- |
| Lekcje                   |                71 600 | 17 900 uczniów × 4 lekcje                                                          |
| Zadania                  |               143 000 | ~2 na lekcję, `assignments`                                                        |
| Wiersze `user_history`   |               600 000 | ~30 zdarzeń/user                                                                   |
| **E-maile**              |          **~222 000** | 5 zadań cron wysyłających pocztę (rozbicie w § 2.3)                                |
| Tokeny AI                | ~290 M in / 30 M out  | `weekly-insights` + agenci on-demand                                               |
| Szczyt połączeń realtime |                 ~600  | `components/notifications/useNotifications.ts` — kanał na zalogowanego użytkownika |

---

## 2. Wariant rekomendowany: managed dostrojony — **~$215/mies.**

Ta sama architektura co dziś (Vercel + Supabase), tylko z podjętymi decyzjami
zamiast domyślnych.

### 2.1 Vercel — **$80**

| Pozycja               | Wyliczenie                                                     |    Koszt |
| --------------------- | -------------------------------------------------------------- | -------: |
| Pro (1 seat)          | $20, w tym $20 kredytu na usage                                 |      $20 |
| Fast Data Transfer    | ~700 GB przy `Cache-Control: immutable` na chunkach — **w cenie** |     $0 |
| Edge requests         | ~17 M; 10 M w cenie, 7 M × ~$2/M                                |      $14 |
| Fluid compute (CPU)   | 8,5 M × 0,12 s = 283 h × $0,128/h                               |      $36 |
| Provisioned memory    | 2 125 GB-h × $0,0106                                            |      $23 |
| Kredyt seatowy        |                                                                  |     −$20 |
| **Razem**             |                                                                  |  **$73** |

Różnica wobec wariantu „z domyślnych" ($202) to wyłącznie **dyscyplina
cache'owania**. Bez `immutable` na statycznych chunkach ta sama aplikacja
przesyła ~1,3 TB zamiast 700 GB i generuje dwa razy więcej edge requestów —
$130/mies. za nagłówek HTTP.

Drugi warunek: avatary i okładki idą przez `getPublicUrl()` Supabase Storage
(`lib/storage/avatar.ts`, `songCover.ts`) — dopilnuj, żeby **nie** przechodziły
przez optymalizator `next/image`, bo 20 000 avatarów to 20 000 płatnych
transformacji za nic.

### 2.2 Supabase — **$52**

| Pozycja           | Wyliczenie                                                        |    Koszt |
| ----------------- | ----------------------------------------------------------------- | -------: |
| Pro               | baza, w tym $10 kredytu compute                                    |      $25 |
| Compute **Small** | $15 − $10 kredytu                                                  |       $5 |
| Rozmiar bazy      | ~16 GB z indeksami; 8 GB w cenie, 8 GB × $0,125                    |       $1 |
| Realtime          | szczyt ~600 połączeń vs 500 w cenie                                |      $10 |
| Egress (unified)  | ~350 GB; 250 GB w cenie, 100 GB × $0,09                            |       $9 |
| Backup            | własny `pg_dump` co godzinę na Backblaze B2 zamiast PITR ($100)    |       $2 |
| Storage, Auth MAU | 7 GB ze 100 GB; 20 000 MAU ze 100 000                              |       $0 |
| **Razem**         |                                                                    |  **$52** |

Dwie decyzje, które robią tu całą różnicę:

**Small zamiast Large.** Przy 3,3 req/s Large (8 GB RAM, 2 dedykowane rdzenie,
$110) to sprzęt kupiony na zapas przed pomiarem. Warunek: agregaty dashboardu
nauczyciela mają indeksy. Jeden brakujący indeks kosztuje więcej niż cały
Vercel — więc **zmierz zapytania zamiast dokupywać compute**, a jeśli pomiar
każe wejść na Medium ($60), to będzie decyzja oparta o dane, nie o lęk.

**Brak PITR ($100/mies.).** Pro ma w cenie dzienne backupy z 7-dniową retencją.
PITR daje RPO liczone w minutach zamiast w dobie. Dla CRM szkoły muzycznej —
lekcje, zadania, repertuar, zero płatności — utrata do 24 h danych jest
odtwarzalna z kalendarzy i pamięci nauczycieli. Godzinowy `pg_dump` na B2 zbija
to okno do godziny za $2. **Wróć do PITR w dniu, w którym w bazie pojawią się
faktury** — tam doba utraty jest nie do odtworzenia.

**Realtime**: `useNotifications` otwiera kanał na zalogowanego użytkownika.
Zamiana na polling co 60 s dla powiadomień (a nie dla niczego innego) zdejmuje
te $10 i upraszcza skalowanie — do rozważenia, nie pilne.

**Connection pooling**: Vercel serverless × 2 000 równoległych nauczycieli =
obowiązkowo Supavisor w trybie transaction. To nie jest kwestia kosztu, tylko
działania — bez tego wyczerpiesz połączenia Postgresa dużo wcześniej niż CPU.

### 2.3 E-mail: **Amazon SES $22** zamiast Resend $200 ← największa oszczędność

| Zadanie cron                            | E-maili/mies. |
| --------------------------------------- | ------------: |
| `lesson-reminders`                       |        71 600 |
| `assignment-due-reminders`               |        57 000 |
| `weekly-digest`                          |        52 000 |
| `assignment-overdue-check`               |        20 000 |
| Transakcyjne (auth, zaproszenia, reset)  |        12 000 |
| `weekly-insights` (nauczyciele)          |         8 700 |
| **Razem**                                |  **~222 000** |

| Dostawca      | Koszt 222k/mies. |
| ------------- | ---------------: |
| Resend        |         $180–250 |
| **Amazon SES** |      **$22,20** | ($0,10 za 1 000)

**Migracja to trzy zmienne środowiskowe i zero linijek kodu.**
`lib/email/smtp-client.ts` ma już `SMTP_HOST` jako override o **najwyższym**
priorytecie — przed `RESEND_API_KEY`. SES wystawia zwykły endpoint SMTP, więc
`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` wystarczą. Nodemailer nie zauważy
różnicy.

Czego SES wymaga w zamian: weryfikacji domeny z DKIM, wyjścia z sandboxa
(wniosek o production access), rozgrzania wolumenu i **własnej obsługi bounce'ów
i skarg przez SNS** — AWS zawiesza konto powyżej 5% bounce lub 0,1% skarg.
`checkBounceRate()` w `admin-monitoring` już istnieje, więc połowa tej pracy
jest zrobiona. To jest realny narzut ~4 h jednorazowo za $178/mies. — najlepiej
płatna godzina w całym tym dokumencie.

Na tym nie trzeba kończyć. 222k maili miesięcznie to też koszt reputacyjny, a
połowa tego wolumenu jest decyzją produktową, nie techniczną:

- `weekly-digest` domyślnie **off** zamiast on: −52k
- Batching przypomnień o zadaniach — jeden mail dziennie zamiast per zadanie: −35k
- Powiadomienia in-app zamiast mailowych dla uczniów: −70k

Po cięciach: ~90k/mies. → **$9 na SES**. Rachunek za pocztę przestaje istnieć.

### 2.4 AI — **$25**

~290 M tokenów wejściowych / 30 M wyjściowych miesięcznie.

| Wariant                                          | Koszt/mies. |
| ------------------------------------------------ | ----------: |
| Frontier na wszystkim (~$3/$15 za M)              |      $1 320 |
| Model średni (~$1/$3 za M)                        |        $380 |
| Tani model (~$0,10/$0,30 za M)                    |         $38 |
| **Batch na Ollamie (`uwh`) + tani model interaktywnie** | **~$25** |

Warstwa abstrakcji już to umożliwia: `lib/ai/providers/ollama.ts` stoi obok
`openrouter.ts`. `weekly-insights` dla 2 000 nauczycieli to zadanie nocne bez
użytkownika po drugiej stronie — nie ma powodu, żeby szło do płatnego API.
Warunek: batch musi degradować się cicho, gdy `uwh` nie odpowiada. Insight,
który nie doszedł, nie może zablokować dispatchera.

**Ryzyko do zamknięcia niezależnie od wariantu**: `resolveOpenRouterModel()` w
`lib/ai/model-mappings.ts` po cichu ucina sufiks `:free` i kieruje ruch na
wariant **płatny**, bo OpenRouter wycofał darmowe endpointy. Ten sam
identyfikator modelu, inny cennik, zero zmian w kodzie. Przy 100 szkołach
potrzebne są: twardy limit per tenant (obok istniejącego
`lib/ai/rate-limiter.ts`), budżet miesięczny i alert.

### 2.5 Obserwowalność — **$26**

| Pozycja | Koszt | Warunek                                                              |
| ------- | ----: | -------------------------------------------------------------------- |
| Sentry Team |  $26 | traces sampling 1% — bez tego $100+                                |
| PostHog |    $0 | ~300k zdarzeń produktowych mieści się w darmowym progu 1 M/mies.      |

PostHog z autocapture przy 2,4 M odsłon to ~10 M zdarzeń/mies. → **$150–450**, a
z session replay wielokrotnie więcej. Przy ~15 świadomych zdarzeniach
produktowych na użytkownika jesteś **za darmo**. Różnica między tymi dwoma
światami to jedna decyzja w `components/providers/PostHogProvider.tsx`.

Wariant za $0: GlitchTip (API zgodne z Sentry) na `uwh`. Oszczędza $26 i kosztuje
utrzymanie kolejnej usługi — przy tej kwocie nie warto.

### 2.6 Pozostałe — **$10**

Domena i DNS (Cloudflare free) $2 · Backblaze B2 na backupy $3 · uptime
monitoring (Uptime Kuma na `uwh`) $0 · GitHub Actions **$0** (repo publiczne,
runnery e2e i tak są self-hosted).

### 2.7 Suma

| Pozycja        | Dostrojony | Po cięciach poczty | „Z domyślnych" |
| -------------- | ---------: | -----------------: | -------------: |
| Vercel         |        $80 |                $80 |           $202 |
| Supabase       |        $52 |                $52 |           $245 |
| E-mail         |        $22 |                 $9 |           $200 |
| AI             |        $25 |                $25 |           $100 |
| Obserwowalność |        $26 |                $26 |           $150 |
| Pozostałe      |        $10 |                $10 |            $33 |
| **RAZEM**      |   **$215** |           **$202** |       **$930** |

**Na szkołę: $2,15. Na aktywnego użytkownika: $0,011.**

---

## 3. Gdzie rachunek „z domyślnych" jest zawyżony

Cztery decyzje odpowiadają za $715 z $930 — 77% rachunku:

| Decyzja domyślna                    | Oszczędność | Koszt zmiany                                         |
| ----------------------------------- | ----------: | ---------------------------------------------------- |
| Resend zamiast SES                  |        $178 | ~4 h: DKIM, wyjście z sandboxa, bounce'y przez SNS   |
| PITR zamiast dziennych backupów + `pg_dump` | $98 | ~2 h skryptu; RPO 24 h → 1 h zamiast minut          |
| Supabase Large zamiast Small        |         $95 | ~4 h: pomiar zapytań dashboardu i indeksy            |
| Sentry bez samplingu + PostHog autocapture | $124 | ~1 h konfiguracji                                 |
| Brak dyscypliny cache'owania (Vercel) | $122      | ~1 h nagłówków                                       |

Wspólny mianownik: **żadna z tych pozycji nie jest kosztem skali.** Każda jest
kosztem ustawienia domyślnego, które nikt nie zakwestionował. Przy 20 000 MAU i
3,3 req/s nie płacisz za ruch — płacisz za wygodę i za sprzęt kupiony przed
pomiarem.

---

## 4. Podłoga: Cloudflare + Hetzner — **~$85/mies.**

Ile da się wycisnąć, jeśli zrezygnować z zarządzanych usług:

| Pozycja                                            |   Koszt |
| -------------------------------------------------- | ------: |
| Cloudflare Workers Paid (OpenNext): $5 + 24 M req × $0,30/M + CPU |    $23 |
| Postgres na Hetzner CCX23 (4 vCPU / 16 GB)         |     $27 |
| Storage Box 1 TB na backupy i snapshoty            |      $4 |
| Amazon SES (po cięciach wolumenu)                  |      $9 |
| AI na `uwh` (Ollama)                               |      $0 |
| GlitchTip + Uptime Kuma na `uwh`                   |      $0 |
| Rezerwa (druga instancja, DNS, drobne)             |     $22 |
| **Razem**                                          | **$85** |

Cloudflare nie pobiera opłat za egress — to jest ta pozycja, która na Vercelu
kosztuje najwięcej i tu znika do zera.

**Dlaczego mimo to nie rekomenduję tego wariantu:**

- Oszczędność wobec dostrojonego managed to **$130/mies.** za **+20 h/mies.**
  ops = **$6,50 za godzinę Twojej pracy**. To jest poniżej stawki, za którą
  warto robić cokolwiek.
- Migracja Next 16 na OpenNext/Workers to realne ryzyko: server actions, RSC,
  streaming i `next/image` mają na Workers inną charakterystykę niż na Vercelu.
  To nie jest przełączenie flagi.
- Tracisz Supabase Auth, Storage i RLS jako gotowce — czyli warstwę, na której
  stoi cały model bezpieczeństwa aplikacji (ADR-0001: baza jest granicą
  bezpieczeństwa). Odtworzenie tego samodzielnie to nie oszczędność, to projekt.
- Stan obecny (`StudentDevelopment` / `StudentProduction` na `uwh`) to już
  self-hosting, a runbook `docs/runbooks/supabase-stack-restart.md` jest dokładnie
  opisem jego ceny: jeden `supabase restart` po cichu psuje linki w mailach i
  **nic się nie wywala**. To jest waluta, w której płaci się za self-hosting —
  godziny i ciche awarie, nie dolary.

Wariant ma sens dopiero przy pierwszym etacie technicznym albo przy ~10×
większym ruchu. Wtedy $130 zamienia się w $1 300 i arytmetyka się odwraca.

---

## 5. Czego świadomie **nie** oszczędzam

Żeby to była wycena, a nie licytacja w dół:

- **Sentry $26** — zamiana na self-hosted GlitchTip oszczędza $26 i dokłada
  usługę do utrzymania. Przy tej kwocie to zła wymiana.
- **Supabase Pro $25** — Free ma pauzowanie projektu po tygodniu bezczynności i
  brak backupów. Dla 100 płacących szkół to nie jest opcja do rozważania.
- **Vercel Pro $20** — Hobby zabrania komercyjnego użycia. Nie ma tu wyboru.
- **Redundancja poczty** — jeśli SES zawiesi konto za bounce rate, nie wychodzi
  ani jeden mail, w tym resety haseł. Warto trzymać Resend jako fallback na
  drugim kluczu (koszt $0 dopóki nieużywany, `smtp-client.ts` już ma kaskadę
  transportów).

---

## 6. Koszt utrzymania ludzkiego — właściwa odpowiedź na „utrzymanie"

| Aktywność                                              | h/mies. |
| ------------------------------------------------------ | ------: |
| Support klientów (100 szkół × 0,5 zgłoszenia × 15 min)  |    12,5 |
| Deploye, monitoring, reakcja na alerty                  |      10 |
| Onboarding nowych szkół (3/mies. × 2 h)                 |       6 |
| Aktualizacje zależności i bezpieczeństwo                |       6 |
| Incydenty i dyżur                                       |       6 |
| **Razem**                                               | **~40** |

**~0,25 FTE, koszt alternatywny $2 000–3 500/mies.** — czyli po dostrojeniu
**10× więcej niż cała infrastruktura**. To jest właściwa liczba do zapamiętania
z tego dokumentu. Przy 100 szkołach support jest pierwszą rzeczą, która się
przewróci, i pierwszą, którą trzeba zatrudnić — nie serwerem.

Konsekwencja dla priorytetów: **godzina włożona w samoobsługowy onboarding albo
w zbicie liczby zgłoszeń jest warta więcej niż wszystko, co da się wynegocjować
na rachunku za hosting.**

---

## 7. Dwa blokery, przez które ten scenariusz dziś nie ruszy

Znalezione w kodzie przy okazji liczenia wolumenów. Żadnego z nich nie rozwiązuje
większy serwer ani tańszy dostawca.

### 7.1 Kolejka powiadomień ma 74× za małą przepustowość

`app/api/cron/dispatcher/route.ts` wywołuje `processQueuedNotifications(100)` —
**100 powiadomień na przebieg** — a dispatcher jest jedynym cronem w
`vercel.json` i chodzi **raz dziennie** o 06:00 UTC. W `.github/workflows/` nie
ma żadnego harmonogramu, który wołałby ten endpoint częściej, mimo że nagłówek
`app/api/cron/process-notification-queue/route.ts` deklaruje „Runs every 15
minutes".

Przepustowość: **100 maili/dobę.** Zapotrzebowanie przy 100 szkołach:
**~7 400/dobę.** Kolejka rośnie w nieskończoność od pierwszego dnia — i boli już
przy trzech szkołach, nie przy stu.

Naprawa: osobny harmonogram co 15 min (cron Vercela albo GitHub Actions) i batch
500 → 48 000/dobę, czyli 6× zapas.

### 7.2 Wszystkie zadania w jednej inwokacji funkcji

Dispatcher odpala 15 zadań równolegle przez `Promise.allSettled` w **jednym**
wywołaniu funkcji Vercela. W niedzielę dochodzi do tego `weekly-digest` dla 20 000
użytkowników, w poniedziałek `weekly-insights` z wywołaniami LLM dla 2 000
nauczycieli. To jest jedna funkcja, jeden timeout (max 14 min na Pro) i jedna
transakcja typu wszystko-albo-nic dla całej dobowej poczty.

Naprawa: dispatcher wyłącznie kolejkuje; wysyłką zajmuje się worker z § 7.1,
zadania tygodniowe idą w batchach po szkole, a nie globalnie.

### 7.3 (Kontekst) Nie ma warstwy szkoły

W 68 migracjach nie występuje ani jedna kolumna `school_id`, `tenant_id` czy
`org_id`, nie ma tabeli organizacji, a model to `nauczyciel → uczniowie`.
Potwierdza to analiza konkurencyjna
(`docs/analysis/2026-08-19-mymusicstaff-competitive-analysis.md`): multi-tenancy i
fakturowanie to udokumentowane braki, nie zaległości.

To nie jest koszt serwera — ale bez tego liczby z tego dokumentu opisują
hipotetyczną aplikację. **„100 szkół" to najpierw dwa projekty produktowe
(warstwa organizacji z RLS per szkoła + billing), a dopiero potem rachunek za
infrastrukturę.**

---

## 8. Sensowność ekonomiczna

100 szkół × 20 nauczycieli = 2 000 nauczycieli. My Music Staff bierze $16,95 za
nauczyciela.

| Cena za nauczyciela |     MRR | Infra $215 jako % MRR |
| ------------------- | ------: | --------------------: |
| $3                  |  $6 000 |                  3,6% |
| $5                  | $10 000 |                  2,2% |
| $8                  | $16 000 |                  1,3% |
| $16,95 (jak MMS)    | $33 900 |                  0,6% |

Benchmark COGS dla SaaS to 10–20%. Po dostrojeniu jesteś **rząd wielkości
poniżej** — infrastruktura przestaje być pozycją, którą warto się przejmować, i
możesz zejść z ceną do $3/nauczyciela, nadal mając zdrową marżę. To jest
przewaga wobec MMS, którą warto policzyć świadomie, zanim ustalisz cennik.

---

## 9. Kolejność działań

Najpierw to, co odblokowuje (§ 7), potem to, co oszczędza (§ 3):

1. **Napraw przepustowość kolejki (§ 7.1)** — bez tego poczta nie wychodzi już
   przy 3 szkołach. Najtańsza zmiana o największym skutku.
2. **Rozbij dispatcher (§ 7.2)** — zanim wolumen tygodniowy przekroczy timeout.
3. **Limity AI per tenant + budżet z alertem** — zanim `resolveOpenRouterModel()`
   wystawi rachunek za wszystkich.
4. **SES zamiast Resend** — trzy zmienne środowiskowe, $178/mies. Najlepiej
   płatne 4 h w tym dokumencie.
5. **Sampling Sentry + dyscyplina zdarzeń PostHog** — 1 h, $124/mies.
6. **Nagłówki cache na statykach** — 1 h, $122/mies.
7. **Zmierz zapytania dashboardu nauczyciela** — decyduje o Small vs Medium vs
   Large, czyli o $95/mies. I zrób to pomiarem, nie przeczuciem.
8. **Zetnij pocztę decyzją produktową** (digest domyślnie off, batching) —
   mniejszy rachunek i mniejsze ryzyko reputacyjne domeny.
9. **Warstwa szkoły i billing (§ 7.3)** — projekt produktowy, nie
   infrastrukturalny.

Punkty 4–7 to razem ~10 h pracy i **$519/mies. = $6 200/rok**.

---

## 10. Ważność cen i źródła

Ceny zweryfikowane **2026-09-08**; cenniki dostawców zmieniają się kilka razy do
roku (Hetzner przecenił dedyki 2026-06-15), więc przed decyzją budżetową odśwież
stawki — struktura modelu i wolumeny z § 1 pozostają ważne.

- Supabase: [makerkit.dev](https://makerkit.dev/blog/saas/supabase-pricing) · [flexprice.io](https://flexprice.io/blog/supabase-pricing-breakdown)
- Vercel: [flexprice.io](https://flexprice.io/blog/vercel-pricing-breakdown) · [makerkit.dev](https://makerkit.dev/blog/saas/vercel-cost)
- Amazon SES: [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/) · [smtpedia.com](https://smtpedia.com/amazon-aws-ses-pricing/)
- Resend: [flexprice.io](https://flexprice.io/blog/detailed-resend-pricing-guide)
- Cloudflare Workers: [developers.cloudflare.com](https://developers.cloudflare.com/workers/platform/pricing/) · [cloudflare.com](https://www.cloudflare.com/plans/developer-platform-pricing/)
- Hetzner: [hetzner.com](https://www.hetzner.com/dedicated-rootserver/matrix-ax/) · [achromatic.dev](https://www.achromatic.dev/blog/hetzner-server-comparison)
