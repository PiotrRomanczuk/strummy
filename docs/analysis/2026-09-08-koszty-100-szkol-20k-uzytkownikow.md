# Koszty serwera i utrzymania — 100 szkół / 20 000 aktywnych użytkowników

**Data**: 2026-09-08
**Zakres**: modelowanie kosztów infrastruktury i utrzymania Strummy w skali
100 szkół muzycznych i 20 000 MAU.
**Metoda**: wolumeny wyprowadzone z rzeczywistego kodu (cron dispatcher, kolejka
powiadomień, warstwa AI, storage, realtime), ceny z cenników dostawców
zweryfikowanych 2026-09-08. Każde założenie jest jawne i podmienialne.

---

## 0. Odpowiedź w jednym akapicie

Sama infrastruktura to **~$930/mies. (widełki $700–1 600)**, czyli **$7–16 na
szkołę** albo **$0,04–0,08 na aktywnego użytkownika**. To jest tania część.
Droga część to **czas utrzymania: ~40 h/mies. (0,25 FTE)** — przy 100 szkołach
support i dyżur przestają mieścić się w wieczorach. A przed tym wszystkim stoją
**dwa blokery w kodzie**, przez które ten scenariusz dziś fizycznie nie ruszy,
niezależnie od tego, ile serwera dokupisz (§ 7). One są ważniejsze niż cała
reszta tego dokumentu.

| Scenariusz                          | Infra/mies. | Czas/mies. | Uwaga                                    |
| ----------------------------------- | ----------- | ---------- | ---------------------------------------- |
| **A. Managed** (Vercel + Supabase)  | ~$930       | ~40 h      | Domyślny. Najmniej ryzyka operacyjnego.  |
| **B. Self-hosted** (Hetzner)        | ~$500       | ~60 h      | Oszczędza $430, kosztuje 20 h. Netto gorzej. |
| **C. Hybryda** (rekomendacja)       | ~$800       | ~42 h      | Managed na ścieżce krytycznej, `uwh` na batchu AI i CI. |

---

## 1. Założenia (i skąd się biorą)

### 1.1 Kształt bazy użytkowników

100 szkół × 200 użytkowników = 20 000 MAU, w podziale:

| Rola       | Liczba | Sesji/mies. | Requestów/sesję | Requestów/mies. |
| ---------- | -----: | ----------: | --------------: | --------------: |
| Uczniowie  | 17 900 |          12 |              20 |           4,3 M |
| Nauczyciele|  2 000 |          22 |              90 |           4,0 M |
| Admini     |    100 |          20 |             120 |          0,24 M |
| **Razem**  | **20 000** |         |                 |     **~8,5 M**  |

Nauczyciel generuje ~10× ruch ucznia — to on siedzi w dashboardzie, listach
uczniów i agregatach. Przy 20 nauczycielach na szkołę **to nauczyciele, a nie
uczniowie, są głównym kosztem compute i egressu.**

Odsłon stron: ~2,4 M/mies. Wolumen ten napędza cały § 2.

### 1.2 Wolumeny wyprowadzone z kodu

| Zjawisko                | Wolumen/mies. | Źródło w kodzie                                          |
| ----------------------- | ------------: | -------------------------------------------------------- |
| Lekcje                  |        71 600 | 17 900 uczniów × 4 lekcje                                 |
| Zadania                 |       143 000 | ~2 na lekcję, `assignments`                               |
| Wiersze `user_history`  |       600 000 | ~30 zdarzeń/user                                          |
| **E-maile**             |  **~222 000** | 5 zadań cron wysyłających pocztę (rozbicie w § 2.3)       |
| Tokeny AI               |  ~290 M in / 30 M out | `weekly-insights` + agenci on-demand (§ 2.4)      |
| Szczyt połączeń realtime|       ~600    | `components/notifications/useNotifications.ts` — kanał na zalogowanego użytkownika |

---

## 2. Scenariusz A — managed (Vercel + Supabase Cloud)

### 2.1 Vercel — **~$220/mies.**

| Pozycja                | Wyliczenie                                         |   Koszt |
| ---------------------- | -------------------------------------------------- | ------: |
| Pro (1 seat)           | $20, w tym $20 kredytu na usage                     |     $20 |
| Edge requests          | ~34 M (8,5 M app × ~4 na statyki/prefetch); 10 M w cenie, ~24 M nadwyżki × ~$2/M |     $48 |
| Fast Data Transfer     | ~1,3 TB (2,4 M PV × 300 KB + 8,5 M × 25 KB JSON); 1 TB w cenie, 0,3 TB × $0,15/GB |     $45 |
| Fluid compute (CPU)    | 8,5 M × 0,12 s = 283 h × $0,128/h                   |     $36 |
| Provisioned memory     | 8,5 M × 0,45 s × 2 GB = 2 125 GB-h × $0,0106        |     $23 |
| Bufor (cold start, ISR, image optimization) | +50% na compute                |     $50 |
| Kredyt seatowy         | −$20                                                |    −$20 |
| **Razem**              |                                                     | **~$202** |

**Dźwignia**: `next/image` naliczany jest za transformację. Avatary i okładki
idą już przez `getPublicUrl()` Supabase Storage (`lib/storage/avatar.ts`,
`songCover.ts`) — dopilnuj, żeby **nie** przechodziły przez optymalizator
Vercela, bo 20 000 avatarów to 20 000 płatnych transformacji za nic.

### 2.2 Supabase Cloud — **~$245/mies.**

| Pozycja           | Wyliczenie                                                           |   Koszt |
| ----------------- | -------------------------------------------------------------------- | ------: |
| Pro               | baza, w tym $10 kredytu compute                                       |     $25 |
| Compute Large     | 8 GB RAM / 2 dedykowane rdzenie, $110 − $10 kredytu                   |    $100 |
| Rozmiar bazy      | ~15 M wierszy/rok ≈ 16 GB z indeksami; 8 GB w cenie, 8 GB × $0,125    |      $1 |
| Realtime          | szczyt ~600 połączeń vs 500 w cenie                                   |     $10 |
| Egress (unified)  | ~350 GB (zapytania + storage); 250 GB w cenie, 100 GB × $0,09         |      $9 |
| Storage           | ~7 GB (avatary + okładki) — mieści się w 100 GB                       |      $0 |
| Auth MAU          | 20 000 z 100 000 w cenie                                              |      $0 |
| **PITR 7 dni**    | dane 100 szkół — to nie jest opcja                                    |    $100 |
| **Razem**         |                                                                       | **~$245** |

**Ryzyko**: `Large` to założenie optymistyczne — zakłada, że agregaty
dashboardu nauczyciela i polityki RLS są otestowane pod indeksy. Jeśli nie,
skok na `XL` ($210) to +$100/mies. Odpowiedź nie brzmi „dokup compute", tylko
„zmierz zapytania" — na tej skali jeden brakujący indeks kosztuje więcej niż
cały Vercel.

**Connection pooling**: Vercel serverless × 2 000 równoległych nauczycieli =
obowiązkowo Supavisor w trybie transaction. Bez tego wyczerpiesz połączenia
Postgresa dużo wcześniej, niż wyczerpiesz CPU.

### 2.3 E-mail (Resend) — **~$200/mies.** ← największa pozycja zmienna

| Zadanie cron                | E-maili/mies. |
| --------------------------- | ------------: |
| `lesson-reminders`          |        71 600 |
| `assignment-due-reminders`  |        57 000 |
| `weekly-digest`             |        52 000 |
| `assignment-overdue-check`  |        20 000 |
| Transakcyjne (auth, zaproszenia, reset) | 12 000 |
| `weekly-insights` (nauczyciele) |         8 700 |
| **Razem**                   |  **~222 000** |

Resend: Scale $90 = 100k; 222k mieści się w wyższym podprogu ≈ **$180–250**.

**To jedyna pozycja rosnąca liniowo z liczbą uczniów** — i jedyna, którą można
ściąć decyzją produktową, nie techniczną:

- `weekly-digest` domyślnie **off** zamiast on: −52k (−$45)
- Batching przypomnień o zadaniach: jeden mail dziennie zamiast per zadanie: −35k
- Powiadomienia in-app/push zamiast mailowych dla uczniów: −70k

Łącznie realna redukcja o ~60% → **$80/mies.** Do tego dochodzi to, czego nie
widać w cenniku: 222k maili miesięcznie to poziom, na którym reputacja domeny i
bounce rate zaczynają być pracą, a nie ustawieniem. `checkBounceRate()` w
`admin-monitoring` już istnieje — dobrze.

### 2.4 AI (OpenRouter) — **$40–1 300/mies.** ← największe ryzyko

~290 M tokenów wejściowych / 30 M wyjściowych miesięcznie (weekly-insights +
agenci on-demand).

| Klasa modelu           | Koszt/mies. |
| ---------------------- | ----------: |
| Tani (~$0,10/$0,30 za M) |        $38 |
| Średni (~$1/$3 za M)     |       $380 |
| Frontier (~$3/$15 za M)  |     $1 320 |

**Konkretne ryzyko w kodzie**: `resolveOpenRouterModel()` w
`lib/ai/model-mappings.ts` po cichu ucina sufiks `:free` i przekierowuje na
wariant **płatny**, bo OpenRouter wycofał darmowe endpointy. W dev to jest
wygoda. Przy 100 szkołach to jest niekontrolowany rachunek, który powstaje bez
żadnej zmiany w kodzie — ten sam identyfikator modelu, inny cennik. Zanim
wejdzie pierwsza płacąca szkoła, potrzebne są: twardy limit per tenant (obok
istniejącego `lib/ai/rate-limiter.ts`), budżet miesięczny z alertem i domyślny
routing na tani model.

**Przyjmuję $100/mies.** przy dyscyplinie: tani model domyślnie, frontier tylko
na jawne żądanie nauczyciela z limitem.

### 2.5 Obserwowalność — **~$150/mies.**

| Pozycja  | Koszt | Warunek                                                        |
| -------- | ----: | -------------------------------------------------------------- |
| Sentry   |  $100 | Team $26 + wolumen; **traces sampling 1–5%**, inaczej 3× drożej |
| PostHog  |   $50 | Tylko przy dyscyplinie zdarzeń — patrz niżej                    |

PostHog z autocapture przy 2,4 M odsłon to ~10 M zdarzeń/mies. → **$150–450**,
a z session replay wielokrotnie więcej. Przy ~15 zdarzeniach produktowych na
użytkownika (300k/mies.) mieścisz się w **$0–50**. Różnica między tymi dwoma
światami to jedna decyzja w `components/providers/PostHogProvider.tsx`.

### 2.6 Pozostałe — **~$15/mies.**

Domena i DNS (Cloudflare free) $2 · backup off-site do S3/B2 $5 · uptime
monitoring $0–30 · GitHub Actions **$0** (repo publiczne; runnery e2e i tak są
self-hosted na `uwh`).

### 2.7 Suma scenariusza A

| Pozycja        | Realistycznie | Optymistycznie | Pesymistycznie |
| -------------- | ------------: | -------------: | -------------: |
| Vercel         |          $202 |           $150 |           $320 |
| Supabase       |          $245 |           $200 |           $420 |
| Resend         |          $200 |            $80 |           $250 |
| AI             |          $100 |            $40 |           $500 |
| Obserwowalność |          $150 |            $30 |           $250 |
| Pozostałe      |           $15 |            $10 |            $40 |
| **RAZEM**      |      **$912** |       **$510** |     **$1 780** |

**Na szkołę: $5–18/mies. Na aktywnego użytkownika: $0,026–0,089/mies.**

---

## 3. Scenariusz B — self-hosted (Hetzner)

| Pozycja                                        |   Koszt |
| ---------------------------------------------- | ------: |
| 2× CCX33 / AX41-NVMe (aplikacja + Postgres)    | ~$100   |
| 1× CCX23 (runner, monitoring, Ollama)          |  ~$27   |
| Storage Box 1 TB + snapshoty                    |  ~$25   |
| Cloudflare (proxy/WAF)                          |   $0–25 |
| Resend (bez zmian — własnego relaya nie polecam) |   $200 |
| AI                                              |    $100 |
| **Razem**                                       | **~$470** |

Oszczędność wobec A: **~$440/mies. = $5 300/rok.**

Czego nie ma w tej tabeli: PITR trzeba zbudować samemu (WAL-G/pgBackRest), nie
ma autoskalowania, nie ma cudzego dyżuru przy awarii Postgresa o 23:00 w
niedzielę, a każdy upgrade major Postgresa jest Twoim projektem. Realny narzut:
**+20 h/mies.** Przy koszcie alternatywnym $50/h to $1 000/mies. — czyli
**self-hosting w tej skali jest netto droższy**, dopóki jesteś solo. Zmienia się
to dopiero przy pierwszym etacie technicznym albo przy ~10× większym ruchu.

Stan obecny (`StudentDevelopment` / `StudentProduction` na `uwh`) to już
self-hosting — i runbook `docs/runbooks/supabase-stack-restart.md` jest dokładnie
opisem tego kosztu: jeden `supabase restart` po cichu psuje linki w mailach
i **nic się nie wywala**. To jest cena, którą się płaci w godzinach, nie w
dolarach.

---

## 4. Scenariusz C — hybryda (rekomendacja)

Managed wszędzie, gdzie jest SLA wobec klienta; własne żelazo tam, gdzie go nie ma.

- **Vercel + Supabase Cloud + Resend** — ścieżka krytyczna, bez kompromisów.
- **`uwh` przejmuje batch AI**: `weekly-insights` dla 2 000 nauczycieli liczone
  nocą lokalnie przez Ollamę (warstwa abstrakcji `lib/ai/providers/` już to
  umożliwia — `ollama.ts` obok `openrouter.ts`). OpenRouter zostaje tylko dla
  wywołań interaktywnych. AI spada z $100 do ~$20.
- **`uwh` zostaje runnerem CI** — już nim jest (`runs-on: [self-hosted, e2e]`).

**Razem: ~$800/mies.** przy niemal niezmienionym ryzyku operacyjnym, bo nic, co
widzi klient, nie zależy od LAN-u. Jedyny warunek: batch AI musi degradować się
cicho, gdy `uwh` nie odpowiada — insight, który nie doszedł, nie może zablokować
dispatchera.

---

## 5. Koszt utrzymania ludzkiego (właściwa odpowiedź na „utrzymanie")

| Aktywność                                     | h/mies. |
| --------------------------------------------- | ------: |
| Support klientów (100 szkół × 0,5 zgłoszenia × 15 min) |  12,5 |
| Deploye, monitoring, reakcja na alerty        |      10 |
| Onboarding nowych szkół (3/mies. × 2 h)       |       6 |
| Aktualizacje zależności i bezpieczeństwo      |       6 |
| Incydenty i dyżur                             |       6 |
| **Razem**                                     |  **~40** |

**~0,25 FTE, koszt alternatywny $2 000–3 500/mies.** — czyli **3–4× więcej niż
cała infrastruktura**. To jest właściwa liczba do zapamiętania z tego dokumentu.
Przy 100 szkołach support jest pierwszą rzeczą, która się przewróci, i pierwszą,
którą trzeba zatrudnić — nie serwerem.

---

## 6. Sensowność ekonomiczna

100 szkół × 20 nauczycieli = 2 000 nauczycieli. My Music Staff bierze $16,95 za
nauczyciela (`docs/analysis/2026-08-19-mymusicstaff-competitive-analysis.md`).

| Cena za nauczyciela | MRR      | Infra jako % MRR |
| ------------------- | -------: | ---------------: |
| $5                  | $10 000  |             9,1% |
| $8                  | $16 000  |             5,7% |
| $16,95 (jak MMS)    | $33 900  |             2,7% |

Benchmark COGS dla SaaS to 10–20%. **Nawet przy cenie trzykrotnie niższej od
konkurencji marża infrastrukturalna jest zdrowa.** Koszt serwera nie jest
ograniczeniem tego biznesu — ograniczeniem jest czas jednej osoby (§ 5) i dwa
blokery poniżej.

---

## 7. Dwa blokery, przez które ten scenariusz dziś nie ruszy

Znalezione w kodzie przy okazji liczenia wolumenów. Żadnego z nich nie rozwiązuje
większy serwer.

### 7.1 Kolejka powiadomień ma 74× za małą przepustowość

`app/api/cron/dispatcher/route.ts` wywołuje `processQueuedNotifications(100)` —
**100 powiadomień na przebieg** — a dispatcher jest jedynym cronem w
`vercel.json` i chodzi **raz dziennie** o 06:00 UTC. W `.github/workflows/` nie
ma żadnego harmonogramu, który wołałby ten endpoint częściej, mimo że nagłówek
`app/api/cron/process-notification-queue/route.ts` deklaruje „Runs every 15
minutes".

Przepustowość: **100 maili/dobę.** Zapotrzebowanie przy 100 szkołach:
**~7 400/dobę.** Kolejka rośnie w nieskończoność od pierwszego dnia.

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
Potwierdza to analiza konkurencyjna: multi-tenancy i fakturowanie to
udokumentowane braki, nie zaległości.

To nie jest koszt serwera — ale bez tego liczby z tego dokumentu opisują
hipotetyczną aplikację. **„100 szkół" to najpierw dwa projekty produktowe
(warstwa organizacji z RLS per szkoła + billing), a dopiero potem rachunek za
infrastrukturę.**

---

## 8. Kolejność działań przed skalowaniem

1. **Napraw § 7.1** — najtańsza zmiana o największym skutku; bez niej poczta nie
   wychodzi już przy 3 szkołach.
2. **Rozbij dispatcher (§ 7.2)** — zanim wolumen tygodniowy przekroczy timeout.
3. **Limity AI per tenant + budżet z alertem** — zanim `resolveOpenRouterModel()`
   wystawi rachunek za wszystkich.
4. **Zetnij pocztę decyzją produktową** (digest domyślnie off, batching) — −$120/mies.
   i mniejsze ryzyko reputacyjne domeny.
5. **Dyscyplina zdarzeń PostHog i sampling Sentry** — różnica $30 vs $450/mies.
6. **Zmierz zapytania dashboardu nauczyciela pod indeksy** — decyduje o Large vs XL.
7. **Warstwa szkoły i billing (§ 7.3)** — projekt produktowy, nie infrastrukturalny.

---

## 9. Ważność cen i źródła

Ceny zweryfikowane **2026-09-08**; cenniki dostawców zmieniają się kilka razy do
roku (Hetzner przecenił dedyki 2026-06-15), więc przed decyzją budżetową odśwież
stawki — struktura modelu i wolumeny z § 1 pozostają ważne.

- Supabase: [makerkit.dev](https://makerkit.dev/blog/saas/supabase-pricing) · [flexprice.io](https://flexprice.io/blog/supabase-pricing-breakdown)
- Vercel: [flexprice.io](https://flexprice.io/blog/vercel-pricing-breakdown) · [makerkit.dev](https://makerkit.dev/blog/saas/vercel-cost)
- Resend: [flexprice.io](https://flexprice.io/blog/detailed-resend-pricing-guide) · [automationatlas.io](https://automationatlas.io/answers/resend-pricing-explained-2026/)
- Hetzner: [hetzner.com](https://www.hetzner.com/dedicated-rootserver/matrix-ax/) · [achromatic.dev](https://www.achromatic.dev/blog/hetzner-server-comparison)
