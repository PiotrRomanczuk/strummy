# Plan marketingowy: pierwsi nauczyciele i szkoły muzyczne przez social media

**Data**: 2026-09-01
**Horyzont**: 90 dni (wrzesień – listopad 2026)
**Cel biznesowy**: 30 zakwalifikowanych leadów nauczycielskich, 10 nauczycieli
realnie używających Strummy z własnymi uczniami, 2–3 rozmowy ze szkołami
zakończone pilotażem.
**Budżet**: 0 zł obowiązkowo, do 400 zł/mies. opcjonalnie (test płatny w fazie 3).
**Zasób czasowy**: ~5 h/tydzień jednej osoby, która równolegle uczy 20+ uczniów.

---

## 0. Przeczytaj to najpierw: szkoły ≠ nauczyciele

To jest najważniejsze zdanie w całym dokumencie i wynika z kodu, nie z opinii:

> **Strummy dzisiaj nie jest produktem dla szkoły muzycznej.** Nie ma
> multi-tenancy, nie ma per-seat billingu, nie ma fakturowania, a rola Teacher
> renderuje widok Admina, bo właściciel jest jedynym nauczycielem
> (`CLAUDE.md` § Role-Based Access Control). Panel dyrektora, rozliczenie
> nauczycieli i raport frekwencji — nie istnieją.

Konsekwencje dla planu:

- **Nauczyciel prywatny (1–30 uczniów) to jedyny ICP, do którego sprzedajesz
  self-serve.** Cała maszyna contentowa celuje w niego.
- **Szkoła to nie kanał sprzedaży, tylko pipeline design-partnerski.** Maksymalnie
  2–3 szkoły, onboardowane ręcznie, z jasno powiedzianym „jesteśmy w becie,
  buduję to z wami". Wejście czwartej szkoły przed multi-tenancy to zobowiązanie,
  którego nie da się dowieźć.
- **Nie buduj landingu „dla szkół" w tym kwartale.** Landing obiecuje produkt,
  którego nie ma. Rozmowa ze szkołą ma się zaczynać od DM-a albo maila, nie od
  strony, która sprzedaje w twoim imieniu rzeczy nieistniejące.

Druga rzecz, którą trzeba powiedzieć wprost: **„na świecie" w 90 dni to za szeroko.**
Content po angielsku dociera wszędzie, ale konwersja wymaga rozmowy, a rozmowa
wymaga strefy czasowej i języka. Plan zakłada **dwa rynki naraz**: Polska (dom,
szybka pętla zwrotna, możliwość spotkania offline) i anglojęzyczny internet
(US/UK/CA/AU — największa populacja nauczycieli gitary online). Reszta świata
przychodzi sama z zasięgów, ale nie jest celem.

---

## 1. Co masz na starcie (audyt zasobów marketingowych)

Zanim zaplanujesz cokolwiek, policz amunicję. To jest nietypowo mocny zestaw jak
na pre-launch:

| Zasób | Stan | Wartość marketingowa |
| :--- | :--- | :--- |
| **Założyciel = praktykujący nauczyciel gitary** | Warszawa, 20+ uczniów, uczy nadal | Największy pojedynczy atut. Nie jesteś software house'em sprzedającym nauczycielom — jesteś jednym z nich |
| **Demo studio z prawdziwymi zapisami** | `sarah@strummy.app` / `Demo2024!`, zapisy włączone | Zero-friction CTA. Nie „zarejestruj się", tylko „wejdź i poklikaj" |
| **Interaktywny fretboard** | Każda skala i akord, w każdej tonacji, w przeglądarce | **Najlepszy magnes na zasięg w całym produkcie.** Wartość dla gitarzysty, nie tylko nauczyciela |
| **Biblioteka utworów z tabami** | Ultimate Guitar + Spotify + YouTube | Materiał na treści „co grać z uczniem na X poziomie" |
| **Publiczny changelog + 180 wydań** | Tygodniowy rytm wydawniczy | Paliwo na build-in-public, dowód że produkt żyje |
| **Screenshoty produktu** | `public/screenshots/` — 9 ekranów | Gotowe assety pod karuzele |
| **Formularz `/for-teachers` z atrybucją UTM** | `?source=` / `?utm_source=` → kolumna `source` | **Pomiar działa już dzisiaj.** Nie trzeba nic budować, żeby wiedzieć, który kanał dowozi |
| **Dziennik ćwiczeń z tempem** | Włączony (`SHOW_PRACTICE_FEATURES = true`), loguje BPM i wiąże sesję z utworem | Model danych bogatszy niż u My Music Staff, który ma tylko dni i godziny. Najlepszy materiał „do pokazania rodzicowi" |
| **Darmowa beta bez karty** | Wszystkie funkcje, permanentna zniżka po launchu | Usuwa główną obiekcję ceny na etapie zimnego kontaktu |

Czego brakuje i co realnie zaboli w rozmowie sprzedażowej:

- **Faktury i płatności** — to jest powód, dla którego nauczyciel płaci
  My Music Staff 16,95 USD/mies. Padnie w pierwszych trzech rozmowach.
- **Frekwencja** — zero agregatu, a szkoły pytają o to jako pierwsze.
- **Brak jakiejkolwiek obecności produktu w social media.** Startujesz od zera
  obserwujących, co narzuca kolejność kanałów w § 4.

---

## 2. Pozycjonowanie i komunikat

### Jedno zdanie

> **Strummy pamięta, co ćwiczył każdy uczeń — żebyś ty nie musiał.**

### Dlaczego to, a nie „CRM dla nauczycieli muzyki"

Kategoria „CRM/studio management" jest zajęta przez My Music Staff, Duet, Fons i
resztę — walczą o to samo słowo, wszystkie mówią o fakturach i grafiku. Ty w tej
kategorii przegrywasz na funkcjach (nie masz płatności). **Wygrywasz w kategorii
obok: pętla dydaktyczna.** Nikt z konkurencji nie mówi o tym, co uczeń faktycznie
gra i jak to idzie — bo wszyscy zbudowali back-office, nie narzędzie do uczenia.

Twój wróg w komunikacji to nie My Music Staff. Twój wróg to **arkusz Google,
zeszyt i cztery wątki na WhatsAppie** — bo tam siedzi 90% rynku i to jest ból,
który każdy nauczyciel rozpozna w pierwszej sekundzie filmu.

### Trzy komunikaty do trzech odbiorców

| Odbiorca | Ból, który czuje | Komunikat |
| :--- | :--- | :--- |
| **Nauczyciel prywatny** | „Co my robiliśmy ostatnio?" na starcie każdej lekcji | Wchodzisz na lekcję już wiedząc, gdzie skończyliście |
| **Szkoła / dyrektor** | Nie wie, co się dzieje na lekcjach; rodzic pyta o postępy | Jedno miejsce, w którym widać postęp każdego ucznia — gotowe do pokazania rodzicowi |
| **Uczeń / rodzic** (wtórny) | Nie wie, co ćwiczyć w tygodniu | Repertuar i zadania zawsze pod ręką, bez proszenia nauczyciela |

### Wiarygodność, gdy w kadrze nie ma autora

Przez pierwsze 1–3 miesiące **obraz jest w całości generowany i nie pokazuje
autora** — bez twarzy, bez rąk. **Lektorem jest własny głos założyciela.**

Głos ratuje tu bardzo dużo. Zdanie „uczę gitary w Warszawie, mam dwudziestu
uczniów" wypowiedziane przez autora jest dowodem, że za kanałem stoi konkretny
człowiek z konkretną praktyką — czyli dokładnie tym, co niesie pozycjonowanie.
Reszta dowodu przychodzi z rzeczy publicznych, datowanych i sprawdzalnych
w trzydzieści sekund.

| Zamiast | Pokazujesz |
| :--- | :--- |
| „zbudował to praktykujący nauczyciel" | głos autora + publiczne repozytorium i historia commitów |
| „pracuję nad tym stale" | listę 180 wydań z datami |
| „to działa" | nagranie ekranu z demo studia |
| twarz w kadrze | głos w pierwszej osobie i tekst podpisany imieniem |

Tekst zostaje na ekranie mimo lektora, bo większość ogląda bez dźwięku — klip
musi działać w obu trybach. Bio mówi wprost, kto za tym stoi, nawet gdy klipy
tego nie pokazują; link do repozytorium robi tam więcej niż zdjęcie.

Jedyna realna strata to **ręce na gryfie**: nie demonstrujesz własnej gry,
a w niszy gitarowej to jest waluta. Animacja rekompensuje czytelnością, ale nie
w całości.

**Dwa rynki oznaczają teraz dwie ścieżki dźwiękowe.** Przy samej typografii jeden
klip obsługiwał oba rynki po podmianie tekstu; z lektorem każdy potrzebuje nagrania
po polsku i po angielsku. Wizualizacje renderujesz raz i są wspólne, więc koszt to
kilka minut na klip. Akcentu nie ukrywaj — nauczyciel z Warszawy mówiący po
angielsku brzmi wiarygodniej niż głos neutralny, bo akcent jest zgodny z historią.

Filar C jest z tego powodu przebudowany z opowieści o sobie na pokazywanie
publicznych artefaktów — szczegóły w banku treści.

### Czego NIE mówić

- Nie mów „AI-powered". Nauczyciele gitary nie kupują AI, kupują spokój.
  AI jest funkcją w produkcie, nie nagłówkiem.
- Nie porównuj się publicznie z My Music Staff. Przy 0 użytkownikach porównanie
  legitymizuje ich, nie ciebie.
- Nie obiecuj fakturowania „wkrótce". Powiedz, że tego nie ma i że na razie
  rozliczenia zostają tam, gdzie są.

---

## 3. ICP — do kogo dokładnie mówisz

**Podstawowy (90% wysiłku):**
nauczyciel gitary, 6–30 uczniów, uczy prywatnie lub mieszanie (dom/online),
25–45 lat, prowadzi grafik w kalendarzu Google, notatki w zeszycie albo Notion,
aktywny na Instagramie lub w grupach FB, ma dość admina po godzinach.

**Sygnały kwalifikacji (widoczne z profilu):**
- ma w bio „guitar teacher / lekcje gitary / nauka gitary"
- publikuje materiały edukacyjne (nie tylko covery)
- ma link do Calendly / formularza zapisu → traktuje uczenie jak biznes

**Dyskwalifikacja:** twórcy kursów online bez uczniów 1:1 (inny produkt),
nauczyciele z 1–3 uczniami (za mało bólu, żeby zmienić nawyk), szkoły powyżej
10 nauczycieli (nie obsłużysz ich dzisiaj).

**Szkoła jako design partner:** 2–6 nauczycieli, właściciel uczy sam, prowadzi
zapisy w arkuszu. Większe mają już system i wewnętrzne procesy, których nie
przebijesz.

---

## 4. Kanały — priorytet i uzasadnienie

Kolejność wynika z jednego faktu: **masz zero obserwujących i pięć godzin
tygodniowo.** Dlatego zaczynasz od miejsc, gdzie nauczyciele już się zebrali, a
nie od budowania własnej publiczności od zera.

### Tier 1 — robisz od pierwszego tygodnia

**1. Grupy na Facebooku (najwyższa konwersja, najniższy zasięg)**
To jest jedyne miejsce w internecie, gdzie nauczyciele gitary są zgromadzeni
i rozmawiają o problemach zawodowych. Grupy typu „Guitar Teachers",
„Music Teachers Network", „Music Studio Owners", plus polskie grupy
nauczycieli muzyki i instruktorów.
- Zasada: **30 dni dawania, zanim cokolwiek wspomnisz o produkcie.** Odpowiadaj
  na pytania o metodykę, repertuar, radzenie sobie z uczniem, który nie ćwiczy.
- Potem: post typu „zbudowałem to dla siebie, oddaję za darmo w becie, szukam
  5 nauczycieli do przetestowania" — z linkiem tylko wtedy, gdy regulamin pozwala.
- To da najwięcej pierwszych rozmów, ale zasięg jest ograniczony i nieskalowalny.

**2. Instagram Reels (główny silnik zasięgu)**
Społeczność gitarowa na IG jest ogromna, a format pionowy 20–40 s pasuje do
pokazania fretboardu i ekranu produktu. Konto osobiste-zawodowe („uczę gitary,
buduję Strummy"), nie korporacyjne — konta produktowe bez twarzy nie działają
w tej niszy.

**3. TikTok (zimne odkrycie)**
Ten sam materiał wideo, inna dystrybucja. TikTok nadal daje zasięg kontu bez
historii — Instagram już nie. Traktuj jako darmowy drugi rzut tego samego assetu.

**4. YouTube Shorts (wieczysty long tail)**
Trzecie miejsce dla tego samego pliku. Dodatkowo YouTube jest wyszukiwarką —
Short o „minor pentatonic all over the neck" żyje miesiącami, Reel żyje 72 h.

> **Reguła jednego assetu**: nagrywasz raz, publikujesz w trzech miejscach.
> Bez tego 5 h/tydzień się nie domknie.

### Tier 2 — dokładasz od 4. tygodnia

**5. Reddit** — r/guitarlessons, r/guitarteachers, r/musiceducation, r/WeAreTheMusicMakers.
Reddit karze marketing i nagradza konkret. Twój format: odpowiedź merytoryczna
z linkiem do **fretboardu** (darmowe narzędzie), nie do landing page'a.

**6. LinkedIn** — jedyny sensowny kanał do szkół. Dyrektorzy szkół muzycznych
i właściciele studiów tam są, konkurencji w tej niszy prawie nie ma. Format:
post o prowadzeniu szkoły/studia, nie o oprogramowaniu.

### Tier 3 — opcjonalnie, jeśli zostanie czas

**7. X/Twitter** — build-in-public dla publiczności technicznej. Nie sprzeda
nauczycielom, ale buduje wiarygodność „to działa naprawdę" i przyciąga
ewentualnych współpracowników. Niski koszt: repostuj changelog.

### Czego nie robisz w tym kwartale

Pinterest, Threads, newsletter, podcast, blog SEO. Każde z nich ma sens za pół
roku. Teraz rozcieńczyłyby jedyne pięć godzin, które masz.

---

## 5. Silnik treści — pięć filarów

> **48 klipów z hookami, strukturą co do sekundy i specyfikacją animacji:**
> `2026-09-01-bank-tresci-social-media.md`. Ten rozdział opisuje filary, bank
> opisuje konkretne odcinki, ścieżkę produkcji i pięć szablonów, z których
> powstają wszystkie klipy. **Tryb produkcji to animacja, nie nagrywanie
> siebie kamerą** — § 0 banku wylicza, co ta decyzja kosztuje w każdym filarze.

Proporcja tygodniowa: **3 posty wartościowe : 1 produktowy.** Odwrotna proporcja
zabija zasięg i wiarygodność.

### Filar A — „30 sekund teorii" (zasięg)
Fretboard w akcji. Jedna skala, jeden trik, jedno przejście akordowe.
Zero produktu w kadrze poza samym narzędziem.
**Cel**: dotarcie do gitarzystów, wśród których 5% uczy.
**Przykłady**: „Dlaczego pentatonika w 5 pozycjach to zły sposób uczenia" ·
„Ten jeden interwał odblokowuje całą podstrunnicę" · „Akord, który brzmi trudno,
a jest łatwiejszy niż G".

### Filar B — „Czwartek nauczyciela" (identyfikacja)
Ból zawodowy, dosłownie ten z landing page'a. To są treści, które nauczyciele
zapisują i wysyłają sobie nawzajem — a zapis to najsilniejszy sygnał dla algorytmu.
**Przykłady**: „Sześć wątków na WhatsAppie, żeby przypomnieć sobie, co robiła
Emma" · „Ile godzin tygodniowo idzie na admin, za który nikt ci nie płaci" ·
„Pierwsze 10 minut lekcji, które tracisz na odtwarzanie własnych notatek".

### Filar C — „Dowody, nie deklaracje" (wiarygodność)
Rzeczy publiczne, datowane i sprawdzalne przez widza: lista wydań, historia
commitów, polityka dostępu w repozytorium, decyzja produktowa i jej uzasadnienie.
**Przykłady**: „180 wydań w rok, wszystkie z datą" · „Nie musisz mi wierzyć na
słowo, kod jest publiczny" · „Wyłączyłem funkcję, którą budowałem 3 tygodnie".
W trybie bezosobowym ten filar **nie opowiada o autorze, tylko pokazuje ślady
jego pracy** — i wychodzi mu to lepiej, bo rejestr wydań jest twardszym dowodem
niż człowiek zapewniający do kamery, że dużo pracuje.

### Filar D — „Produkt w użyciu" (konwersja)
Nagranie ekranu, 20 sekund, jedno zadanie od początku do końca. Bez lektora
o funkcjach — pokazujesz czynność, nie moduł.
**Przykłady**: dopisanie utworu do repertuaru ucznia w 8 s · notatka po lekcji
generowana z obserwacji · widok „co dziś gramy" przed wejściem ucznia.

### Filar E — „Dowód" (od 6. tygodnia)
Screenshot rozmowy z nauczycielem, który zaczął używać. Cytat. Liczba uczniów
w systemie. Dopiero gdy będzie prawdziwy — sfabrykowany dowód w niszy tej
wielkości wraca do ciebie w dwa tygodnie.

### Formaty, które konwertują najlepiej w tej niszy

1. **Split-screen „przed / po"** — zeszyt i WhatsApp kontra jeden ekran.
2. **Nagranie ekranu z ręką na gitarze w rogu** — łączy filar A z D.
3. **Karuzela 5 slajdów** z gotowych screenshotów — najtańsza treść, jaką masz.
4. **Twarz do kamery, 25 s, jeden problem** — najlepszy do filaru B i C.

---

## 6. Plan 90 dni

### Faza 1 — Fundament i wiarygodność (dni 1–30)

**Cel**: 20 postów opublikowanych, 300 obserwujących, 5 rozmów z nauczycielami,
0 sprzedaży. Nie mierzysz jeszcze leadów — mierzysz, czy w ogóle umiesz nagrać
i wypuścić.

| Zadanie | Szczegóły |
| :--- | :--- |
| Konta | IG + TikTok + YT (ta sama nazwa), bio: „Uczę gitary w Warszawie · Buduję Strummy, żeby pamiętał za mnie" + link do `/for-teachers?utm_source=instagram` |
| Wejście do grup | 8–10 grup FB (5 EN, 3 PL), zero promocji, 3 wartościowe odpowiedzi tygodniowo |
| Rytm publikacji | 4 posty/tydzień: 2×A, 1×B, 1×C |
| Link w bio | Osobny UTM per kanał — `instagram`, `tiktok`, `youtube`, `fb-groups`, `reddit`, `linkedin` |
| Pierwsze rozmowy | 5 nauczycieli, których znasz osobiście — nie sprzedaż, wywiad: jak prowadzisz zapiski, co cię wkurza |

**Bramka wyjścia**: jeśli po 30 dniach żaden post nie przekroczył 2000 wyświetleń,
problem jest w treści, nie w dystrybucji. Zmień format, nie kanał.

### Faza 2 — Pierwsi użytkownicy (dni 31–60)

**Cel**: 15 leadów w `/for-teachers`, 5 nauczycieli z realnymi uczniami w systemie.

| Zadanie | Szczegóły |
| :--- | :--- |
| Zmiana miksu | 4 posty/tydzień: 2×A, 1×B/C, **1×D (produkt)** — teraz wolno sprzedawać |
| Post w grupach FB | Jeden szczery post typu „build in public" w każdej grupie, w której masz już historię odpowiedzi |
| DM outreach | 10 spersonalizowanych wiadomości tygodniowo do nauczycieli z Tier-1 sygnałami (skrypt w § 8) |
| Reddit | 2 merytoryczne odpowiedzi tygodniowo z linkiem do fretboardu |
| Onboarding 1:1 | Każdy lead dostaje 20-minutową rozmowę wideo. Ty klikasz, oni patrzą. Bez wyjątków |
| Pętla zwrotna | Po każdej rozmowie: jedno zdanie do backlogu. Pierwsze 5 rozmów przedefiniuje roadmapę |

**Bramka wyjścia**: 5 nauczycieli, którzy wrócili do aplikacji w drugim tygodniu
bez twojego przypomnienia. Jeśli wracają tylko po pingu — problem jest w produkcie,
zatrzymaj marketing i napraw retencję.

### Faza 3 — Skala i pierwsze szkoły (dni 61–90)

**Cel**: 30 leadów łącznie, 10 aktywnych nauczycieli, 2–3 rozmowy ze szkołami.

| Zadanie | Szczegóły |
| :--- | :--- |
| Podwojenie tego, co działa | Weź 3 najlepsze posty z fazy 1–2, nagraj po 3 warianty każdego. Formaty się powtarzają, publiczność nie |
| LinkedIn start | 2 posty/tydzień pod dyrektorów; outreach do 5 szkół (skrypt w § 8) |
| Filar E | Pierwsze prawdziwe cytaty od użytkowników z fazy 2 |
| Test płatny (opcja) | 30 zł/dzień przez 10 dni na **jedną** kreację, która już zadziałała organicznie. Nigdy na nową |
| Pilot szkolny | Maks. 2 szkoły, ręczny onboarding, spisane wprost ograniczenia (brak faktur, brak panelu dyrektora) |

---

## 7. Lejek i pomiar

```
Zasięg (Reel/Short/TikTok)
   └─> Profil / bio
        └─> strummy.online/for-teachers?utm_source=<kanał>
             ├─> Demo studio (sarah@strummy.app)   ← główny cel mikro-konwersji
             └─> Formularz kontaktowy               ← lead, kolumna `source`
                  └─> Rozmowa 20 min
                       └─> Własne konto + pierwszy uczeń  ← jedyna metryka, która się liczy
```

### Metryki — co mierzyć i jak często

**North star**: liczba nauczycieli, którzy dodali **co najmniej jednego własnego
ucznia i wrócili w kolejnym tygodniu.** Wszystko inne jest metryką próżności.

| Poziom | Metryka | Cel 90 dni | Skąd |
| :--- | :--- | :--- | :--- |
| Zasięg | Wyświetlenia/tydzień | 25 000 | Statystyki IG/TikTok/YT |
| Zaangażowanie | Zapisy + udostępnienia na post | > 2% wyświetleń | j.w. |
| Ruch | Sesje na `/for-teachers` | 800 | Vercel Analytics |
| Lead | Wypełnione formularze | 30 | Tabela leadów, kolumna `source` |
| Aktywacja | Konto + 1 własny uczeń | 10 | Baza |
| Retencja | Powrót w tygodniu +1 | 6 z 10 | Baza |

**Atrybucja działa już dzisiaj** — `TeacherLeadForm` czyta `?source=` i
`?utm_source=` z URL-a i zapisuje do kolumny `source`. Warunek: **każdy link,
jaki gdziekolwiek wkleisz, musi mieć UTM.** Link bez UTM to zmarnowany lead.

Konwencja nazw, trzymaj się jej bez wyjątków:
`?utm_source=instagram` · `tiktok` · `youtube` · `fb-groups` · `reddit` ·
`linkedin` · `dm` · `school-outreach`.

### Rytm przeglądu

- **Codziennie, 20 min**: odpowiedzi na komentarze i DM. Pierwsza godzina po
  publikacji decyduje o zasięgu.
- **Piątek, 30 min**: liczby do prostego arkusza. Który post, jaki filar, ile
  wyświetleń, ile kliknięć, ile leadów.
- **Co 30 dni**: bramka wyjścia z fazy. Bez niej plan się rozmyje.

---

## 8. Skrypty kontaktowe

Zasada nadrzędna: **nie wysyłasz oferty, tylko prosisz o zdanie.** Nauczyciel
z 20 uczniami dostaje ofertę codziennie, a o zdanie nie pyta go nikt.

### DM do nauczyciela (IG/FB) — PL

> Cześć [Imię], widziałem Twój materiał o [konkretna rzecz z ich profilu] —
> u siebie robię to podobnie.
>
> Uczę gitary w Warszawie, mam ~20 uczniów i przez lata gubiłem się w tym, kto co
> ćwiczy. Zbudowałem sobie do tego narzędzie i teraz próbuję zrozumieć, czy to
> problem tylko mój.
>
> Jak Ty to ogarniasz — zeszyt, arkusz, coś innego? Serio pytam, zbieram odpowiedzi.

Bez linku w pierwszej wiadomości. Link idzie w drugiej, jeśli odpiszą.

### DM do nauczyciela — EN

> Hi [Name] — saw your post about [specific thing]. I teach the same way.
>
> I teach guitar in Warsaw, around 20 students, and I kept losing track of who was
> working on what. Ended up building a tool for it. Now I'm trying to work out
> whether that's just my problem.
>
> How do you keep track — notebook, spreadsheet, something else? Genuinely asking.

### Post w grupie FB (po 30 dniach obecności)

> Uczę gitary od [X] lat, ~20 uczniów tygodniowo. Najczęstsze pytanie na starcie
> lekcji to „co my robiliśmy ostatnio?" — i przez lata odpowiadałem z pamięci.
>
> Zbudowałem sobie do tego narzędzie: repertuar ucznia, historia lekcji, notatki
> i zadania w jednym miejscu. Używam go codziennie. Jest darmowe w becie, bez karty.
>
> Szukam kilku nauczycieli, którzy sprawdzą to na własnych uczniach i powiedzą mi,
> gdzie to nie działa. Nie sprzedaję — potrzebuję opinii. Link w komentarzu, jeśli
> to zgodne z zasadami grupy.

### Kontakt do szkoły (LinkedIn / mail)

> Dzień dobry,
>
> nazywam się Piotr, uczę gitary w Warszawie i buduję Strummy — narzędzie do
> prowadzenia zapisu tego, co ćwiczy każdy uczeń.
>
> Będę szczery co do etapu: jesteśmy w becie i nie mamy jeszcze fakturowania ani
> panelu dyrektora. Szukam dwóch szkół, które chciałyby to współtworzyć — dostęp
> za darmo na stałe, a w zamian godzina rozmowy raz w miesiącu o tym, czego Wam
> brakuje.
>
> Jeśli to brzmi ciekawie, mogę pokazać na żywo w 20 minut.

Ta szczerość co do braków jest cechą, nie błędem. Szkoła, która wejdzie mimo
tego, wejdzie na właściwych warunkach.

---

## 9. Kalendarz operacyjny (tydzień wzorcowy)

Zaprojektowany pod osobę, która uczy 20 uczniów i nie ma zespołu.

| Dzień | Czas | Zadanie |
| :--- | :--- | :--- |
| **Niedziela** | 90 min | Blok produkcyjny: 3–4 klipy z **jednego szablonu** naraz. Grupuj po szablonach, nie po tygodniach — pierwszy klip z szablonu kosztuje najwięcej, każdy kolejny grosze |
| **Niedziela** | 20 min | Lektor i frazy gitarowe do całej partii za jednym razem, PL i EN — jeden pokój, jedna pora, jedna głośność |
| **Niedziela** | 30 min | Render przez Playwright, konwersja do mp4, montaż dźwięku, napisy w CapCut |
| **Pon/Śr/Pt** | 10 min | Publikacja na IG + TikTok + YT z tego samego pliku |
| **Codziennie** | 20 min | Komentarze, DM, grupy FB — pierwsza godzina po publikacji |
| **Wtorek** | 30 min | 10 DM-ów outreach (faza 2+) |
| **Czwartek** | 30 min | Reddit / LinkedIn |
| **Piątek** | 30 min | Liczby do arkusza, decyzja co powtórzyć |

**Razem: ~5 h/tydzień.** Jeśli tydzień się sypie, tnij w tej kolejności:
Reddit → LinkedIn → outreach → publikacja. **Blok produkcyjny nie wypada nigdy** —
bez niego nie ma czego publikować przez dwa tygodnie.

Przy animacji ten rytm ma inną krzywą niż przy filmowaniu. Pierwsze dwa tygodnie
są droższe, bo powstają szablony; od trzeciego klip kosztuje kilkanaście minut,
a nie półtorej godziny. Jeśli wytrzymasz start, dalej jest łatwiej — odwrotnie
niż przy kamerze, gdzie każdy klip kosztuje tyle samo co pierwszy.

---

## 10. Co zmienić w produkcie, żeby ten plan zadziałał

Krótka lista, uporządkowana po stosunku wysiłku do efektu. To nie jest roadmapa
produktowa — to są rzeczy blokujące marketing.

| Priorytet | Zmiana | Wysiłek | Dlaczego |
| :--- | :--- | :--- | :--- |
| **P0** | Obrazek OG dla `/` i `/for-teachers` | 1 h | Każdy link wklejony w grupie FB i na LinkedIn renderuje się dziś jako nic |
| **P1** | Opcja „szkoła" w formularzu → osobna ścieżka | 2 h | Pole `context.school` już istnieje; brakuje innej odpowiedzi po wysłaniu i innego maila |
| **P1** | Publiczny link do fretboardu bez logowania | zależnie od stanu | To jest twój magnes zasięgowy. Jeśli wymaga konta, tracisz 95% ruchu z Reddita |
| **P2** | Agregat frekwencji | średni | Pierwsze pytanie każdej szkoły. Dane w statusach lekcji już są |
| **P3** | Fakturowanie | duży | Nie blokuje pierwszych 10 nauczycieli. Blokuje setnego |

---

## 11. Ryzyka i czego nie robić

| Ryzyko | Prawdopodobieństwo | Reakcja |
| :--- | :--- | :--- |
| **Ban w grupach FB za autopromocję** | Wysokie, jeśli pominiesz 30 dni dawania | Zasada: 10 wartościowych odpowiedzi zanim padnie słowo „Strummy" |
| **Szkoła wchodzi, produkt nie udźwignie** | Średnie | Limit 2 szkół, ograniczenia spisane w mailu przed startem |
| **Wypalenie w 6. tygodniu** | Wysokie przy jednej osobie | Blok nagraniowy w niedzielę to jedyny nienaruszalny punkt. Reszta jest opcjonalna |
| **Zasięg jest, leadów nie ma** | Średnie | Znaczy, że filar A dociera do gitarzystów, nie do nauczycieli. Przesuń miks w stronę B |
| **Leady są, aktywacji nie ma** | Średnie | Problem produktowy, nie marketingowy. Zatrzymaj kampanię, napraw onboarding |
| **Rozproszenie na 7 kanałów naraz** | Wysokie | Tier 1 przez pierwsze 30 dni. Bez wyjątków |

### Lista „nie robimy tego w tym kwartale"

- Landing page dla szkół (produkt tego nie unosi)
- Płatne reklamy przed 60. dniem (nie masz sprawdzonej kreacji)
- Newsletter, blog SEO, podcast (właściwe za pół roku)
- Cennik i strona pricing (beta jest darmowa, cena to rozmowa, nie strona)
- Zatrudnianie kogokolwiek do social mediów (twoja twarz jest produktem)
- Publiczne porównania z konkurencją

---

## 12. Pierwszy tydzień — konkretna lista

1. Załóż konta IG / TikTok / YouTube pod jedną nazwą, ustaw bio z linkiem UTM.
2. Dołącz do 8 grup FB (5 EN, 3 PL). Nic nie publikuj.
3. Nagraj pierwszy blok: 3 klipy z filaru A (fretboard), 2 z filaru B (ból czwartku),
   1 z filaru C (buduję to sam).
4. Opublikuj pierwsze trzy, po jednym w pon/śr/pt, w trzech miejscach każdy.
5. Dorzuć obrazek OG do `/` i `/for-teachers`.
6. Napisz do 5 nauczycieli, których znasz osobiście — wywiad, nie sprzedaż.
7. Załóż arkusz pomiarowy z kolumnami z § 7.

Jeśli w tym tygodniu zrobisz tylko punkty 1, 3 i 4 — plan i tak ruszył.
