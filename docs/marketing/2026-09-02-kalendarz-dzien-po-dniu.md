# Kalendarz dzień po dniu: 2 września – 29 listopada 2026

**Data**: 2026-09-02
**Dokumenty nadrzędne**: `2026-09-01-social-media-go-to-market.md` (plan) ·
`2026-09-01-bank-tresci-social-media.md` (bank treści) ·
`2026-09-02-kalendarz-12-tygodni.md` (kalendarz na poziomie tygodni — ten
dokument go nie zastępuje, tylko rozbija każdy tydzień na siedem dni z
godzinami)

---

## Cztery rzeczy, które wyszły dopiero na tym poziomie szczegółowości

Rozbicie na dni ujawniło jedną lukę, dwie kolizje kalendarzowe i jedno założenie
techniczne, którego nie było widać na poziomie tygodnia. Zanim przejdziesz do
harmonogramu, przeczytaj to — inaczej pierwszy tydzień nie zepnie się logicznie.

### 1. Brakująca niedziela produkcyjna przed tygodniem 1

Kalendarz tygodniowy każe publikować **A-01** w poniedziałek 7 września, ale
blok produkcyjny na ten klip był przypisany do „tygodnia 1" razem z publikacją
— czyli formalnie mógłby powstać dopiero w niedzielę kończącą tydzień 1
(13 września), **sześć dni po tym, jak miał już wyjść w świat**. To nie jest
możliwe i jest to luka w wersji tygodniowej, nie coś, co możesz obejść.

**Poprawka**: produkcja na dany tydzień zawsze dzieje się **w niedzielę
kończącej tydzień poprzedni**. Tydzień 0 (przygotowanie) kończy się w
niedzielę 6 września — to jest dzień, w którym faktycznie budujesz szablon T1
i cztery pierwsze klipy. Ta niedziela była w wersji tygodniowej pusta; teraz
jest wypełniona.

Dalej mechanizm jest już spójny sam z siebie: niedziela kończąca tydzień 1
(13 września) produkuje klipy na tydzień 2, niedziela kończąca tydzień 2
produkuje na tydzień 3, i tak dalej. **To też tłumaczy, dlaczego tydzień 12 ma
w wersji tygodniowej dopisek „Produkcja: nic nowego"** — jego niedziela
(29 listopada) nie musi niczego produkować, bo kwartał się kończy. To nie był
przypadek w oryginalnym dokumencie, tylko poprawny efekt tego samego wzorca.

### 2. Niedziela 1 listopada niesie za dużo naraz

Pod tym wzorcem niedziela 1 listopada jest jednocześnie: **ostatnim dniem
fazy 2**, dniem **bramki fazy 2** (decyzja: kontynuować czy zatrzymać kampanię)
i **dniem produkcyjnym na tydzień 9** — a do tego jest to **Wszystkich
Świętych**, dzień rodzinny w Polsce.

**Poprawka**: przesuń blok produkcyjny tygodnia 9 na **sobotę 31 października**.
Bramka fazy 2 zostaje oceniana z danych z piątkowego pomiaru (30 października),
nie w locie w niedzielę — sama niedziela 1 listopada staje się dniem tylko na
decyzję, bez presji produkcyjnej.

### 3. Rozmowy onboardingowe i pętla zwrotna nie mają jednego dnia

„Każdy lead dostaje 20-minutową rozmowę, bez wyjątków" i „jedno zdanie do
backlogu po każdej rozmowie" to zadania **reaktywne**, nie dają się przypiąć do
konkretnego dnia tygodnia — przypinam je jako stały nawyk obowiązujący od
tygodnia 6, wypisany raz poniżej, żeby nie powtarzać go w każdej tabeli:

> **Od tygodnia 6**: każdy nowy lead dostaje rozmowę wideo w ciągu 48 godzin od
> zgłoszenia, niezależnie od tego, jaki to dzień tygodnia. Po każdej rozmowie —
> jedno zdanie do backlogu produktowego, tego samego dnia, zanim szczegóły
> wyparują.

### 4. Niedzielny blok 6 września zakłada łańcuch produkcyjny, który jeszcze nie istnieje

Bank treści opisuje ścieżkę „animowany HTML → Playwright → mp4", ale to jest
**specyfikacja, nie zbudowane narzędzie**. Niedzielny blok (90 min budowy
szablonu + 20 min scenariuszy + 30 min renderu) liczy, że ten łańcuch po prostu
zadziała, choć nikt go jeszcze nie uruchomił ani razu. Przy pierwszym
uruchomieniu nowego pipeline'u — konfiguracja Playwrighta pod 1080×1920,
konwersja webm→mp4, dogranie ścieżki dźwiękowej — coś zwykle nie działa za
pierwszym razem, a niedziela nie ma żadnego zapasu na naprawę.

**Poprawka**: dorzuć w sobotę popołudnie osobny blok — **sucha próba na jednym
przykładowym pliku**, zanim niedziela zacznie liczyć na cztery prawdziwe.
Jeśli sucha próba się nie uda, przesuwasz start z 7 września o tyle dni, ile
trzeba naprawić pipeline — nigdy nie publikujesz pierwszego klipu z procesu,
który nigdy wcześniej nie zadziałał od początku do końca. Tydzień 12 i tak
zostaje pusty produkcyjnie, więc jeden dzień poślizgu na starcie nie przesuwa
żadnej bramki fazowej, jedynie datę pierwszej publikacji.

---

## Jak czytać tabele

- **Rano** = 8:00–8:30, zanim zaczniesz lekcje.
- **Wieczór** = 20:00–20:20, po lekcjach.
- Dzień publikacji = wrzucasz plik na IG, TikTok i YouTube Shorts jednocześnie,
  potem zostajesz na **pierwszą godzinę** odpowiadać na komentarze — to jest
  jednocześnie codzienne 20 minut zaangażowania z rytmu operacyjnego, nie
  osobna czynność.
- Numery klipów odsyłają do banku treści. Nazwa szablonu (T1–T5) pojawia się
  tylko w tygodniu, w którym powstaje po raz pierwszy.

---

## Tydzień 0 — przygotowanie · środa 2 – niedziela 6 września

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Środa | 02.09 | Wieczór | Decyzja: klon głosu czy głos z katalogu (bank, § 0). To rozstrzyga wszystko dalej — nie odkładaj. **Tego samego wieczoru wyślij prośby o dołączenie do 8 grup FB** (nie czekaj do piątku) — kolejka akceptacji admina bywa wolna, czasem kilka dni, a zegar 30 dni dawania i tak nie rusza, dopóki nie zaczniesz komentować. Im wcześniej wyślesz prośby, tym mniej czekasz później. Zero publikacji nawet po akceptacji. |
| Czwartek | 03.09 | Wieczór | Nagranie próbki (2–3 minuty zróżnicowanych zdań, nie monotonnego czytania — cichy pokój, stały dystans do mikrofonu) i sklonowanie głosu w ElevenLabs. **Zanim uznasz klon za gotowy**: wygeneruj jedno zdanie z trudną polską wymową („pentatonika", „Strummy") i przesłuchaj. Jeśli brzmi źle, nagraj próbkę ponownie dziś — nie w niedzielę, w środku bloku produkcyjnego, kiedy poprawka kosztuje godziny, nie minuty. Sprawdź też, czy klonowanie wymaga płatnego planu ElevenLabs — to może być pierwszy realny koszt gotówkowy kampanii, wlicz go w budżet z planu głównego. Przypięcie ID głosu, wersji modelu i parametrów — zapisz w repo, nie w pamięci. |
| Piątek | 04.09 | Wieczór | **Najpierw sprawdź, że ta sama nazwa jest wolna na IG, TikToku i YouTube** — dopiero potem zakładaj konta pod jedną nazwą. Bio z linkiem `?utm_source=` osobnym per kanał. |
| Sobota | 05.09 | Rano | Obrazek OG dla `/` i `/for-teachers` (blocker P0). **Po wdrożeniu wymuś ponowne skanowanie w Facebook Sharing Debugger**, zanim wkleisz pierwszy link w grupie — inaczej pusty podgląd trafia do cache'u Facebooka i zostaje tam nawet po naprawie obrazka. Arkusz pomiarowy z kolumnami z § 7 planu. |
| **Sobota** | **05.09** | **Popołudnie (60–90 min, nowy blok)** | **Sucha próba całego łańcucha produkcyjnego** na jednym przykładowym pliku: animowany HTML → render przez Playwright → konwersja do mp4 → napisy. To jest pierwsze uruchomienie tego procesu — cel to znaleźć to, co nie działa, dziś, a nie jutro w środku właściwej produkcji. Jeśli się nie uda, masz jeszcze wieczór i niedzielny poranek na naprawę, zanim ruszy blok właściwy. |
| Sobota | 05.09 | Wieczór | Sprawdzenie wymowy terminów gitarowych w ElevenLabs (lista w § 0 banku): pentatonika, dorycki, barré, add9, CAGED, BPM, Blackbird, Strummy, tryton, septyma. Zapisz działający zapis fonetyczny dla każdego. |
| **Niedziela** | **06.09** | **90 min** | **Blok produkcyjny startowy.** Zbuduj szablon **T1 (gryf)**. Wyprodukuj **A-01, A-03, A-06, A-15** — to jest najdroższy blok w całym kwartale, pierwszy klip z szablonu kosztuje tyle co cztery kolejne razem. Łańcuch produkcyjny jest już sprawdzony z soboty — to jest pierwsze uruchomienie na prawdziwej treści, nie pierwsze uruchomienie w ogóle. |
| Niedziela | 06.09 | 20 min | Scenariusze do syntezy dla tych czterech klipów: generacja PL i EN, przesłuchanie, korekta wymowy. |
| Niedziela | 06.09 | 30 min | Render przez Playwright, konwersja do mp4, montaż dźwięku, napisy w CapCut. Cztery gotowe pliki na poniedziałek. |

> **Jeśli sobotnia sucha próba się nie uda i naprawa nie zmieści się do niedzieli
> wieczorem**: przesuń start z 7 września o tyle dni, ile trzeba, żeby naprawić
> pipeline. Nigdy nie publikuj pierwszego klipu z procesu, który nie zadziałał
> ani razu od początku do końca — jeden dzień poślizgu na starcie nie rusza
> żadnej bramki fazowej z dalszej części kalendarza, tylko datę pierwszej
> publikacji.

---

## Faza 1 — Fundament · tygodnie 1–4 · 7 września – 4 października

Cel: 20 opublikowanych klipów, 300 obserwujących, 5 rozmów z nauczycielami,
**zero sprzedaży**. Miks: 2×A, 1×B, 1×C tygodniowo.

### Tydzień 1 · 7–13 września

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 07.09 | Rano | Publikacja **A-01**. Godzina odpowiedzi na komentarze. |
| Wtorek | 08.09 | Wieczór (30 min) | Grupy FB: 3 wartościowe odpowiedzi. **Zero wzmianki o produkcie.** |
| Środa | 09.09 | Rano | Publikacja **A-03**. Godzina odpowiedzi. |
| Czwartek | 10.09 | Wieczór | Zwykłe 20 min — komentarze z poprzednich dni. Reddit i LinkedIn jeszcze nie startują. |
| Piątek | 11.09 | Rano | Publikacja **A-06**. Godzina odpowiedzi. |
| Piątek | 11.09 | Wieczór (30 min) | **Pierwszy wpis do arkusza pomiarowego.** Nie oceniaj jeszcze niczego — za wcześnie na wnioski. |
| Sobota | 12.09 | Rano | Publikacja **A-15**. Godzina odpowiedzi. |
| **Niedziela** | **13.09** | **140 min** | Blok produkcyjny na **tydzień 2**: zbuduj szablon **T3 (scena tekstowa)**. Wyprodukuj **B-01, B-03, C-01, C-02**. Scenariusze PL/EN, render, napisy. |

### Tydzień 2 · 14–20 września

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 14.09 | Rano | Publikacja **B-01**. Godzina odpowiedzi. |
| Wtorek | 15.09 | Wieczór (30 min) | Grupy FB: 3 odpowiedzi. Nadal zero promocji. |
| Środa | 16.09 | Rano | Publikacja **A-02** (dorabiasz go dziś na szablonie T1, który już masz gotowy z tygodnia 1). |
| Czwartek | 17.09 | Wieczór | Zwykłe 20 min. |
| Piątek | 18.09 | Rano | Publikacja **C-02** — **najmocniejszy dowód, jaki masz w tej fazie** (lista 180 wydań). Jeśli któryś klip fazy 1 ma przebić, to ten. |
| Piątek | 18.09 | Wieczór (30 min) | Arkusz: wyświetlenia, zapisy, udziały per klip. |
| Sobota | 19.09 | Rano | Publikacja **B-03**. Godzina odpowiedzi. |
| **Niedziela** | **20.09** | **140 min** | Blok na **tydzień 3**: zbuduj szablon **T2 (diagram akordu)**. Wyprodukuj **A-04, A-07, A-12, A-13**. |

### Tydzień 3 · 21–27 września

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 21.09 | Rano | Publikacja **A-04**. Godzina odpowiedzi. |
| Wtorek | 22.09 | Wieczór (30 min) | Grupy FB: 3 odpowiedzi. |
| Środa | 23.09 | Rano | Publikacja **B-05**. Godzina odpowiedzi. |
| Czwartek | 24.09 | Wieczór (30 min) | **Reddit start.** Jedna merytoryczna odpowiedź z linkiem `strummy.online/fretboard?utm_source=reddit` — nigdy do landing page'a. Nie klikaj sam przycisk „For teachers" na tej stronie, żeby sprawdzić lejek — dziś gubi ten UTM (plan, § 10). |
| Piątek | 25.09 | Rano | Publikacja **C-01** (produkowany w tygodniu 2, czekał w buforze — to jest bufor w praktyce). |
| Piątek | 25.09 | Wieczór (30 min) | Arkusz + **sprawdzenie bufora**: powinieneś mieć teraz ok. 6 gotowych klipów w zapasie. Jeśli masz mniej, następna niedziela produkuje 5–6 zamiast 4. |
| Sobota | 26.09 | Rano | Publikacja **A-07**. Godzina odpowiedzi. |
| **Niedziela** | **27.09** | **140 min** | Blok na **tydzień 4** (bez nowego szablonu): **A-10, B-02, C-03, A-05**. |

### Tydzień 4 · 28 września – 4 października

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 28.09 | Rano | Publikacja **A-12**. Godzina odpowiedzi. |
| Wtorek | 29.09 | Wieczór (30 min) | Reddit: 1 odpowiedź. |
| Wtorek | 29.09 | Dodatkowo | Wywiad #1 z nauczycielem, którego znasz osobiście — wywiad, nie sprzedaż: jak prowadzi zapiski, co go wkurza. |
| Środa | 30.09 | Rano | Publikacja **B-02**. Godzina odpowiedzi. |
| Czwartek | 01.10 | Wieczór (30 min) | **LinkedIn start**: 1 post o prowadzeniu studia, nie o oprogramowaniu. |
| Czwartek | 01.10 | Dodatkowo | Wywiad #2 i #3. |
| Piątek | 02.10 | Rano | Publikacja **C-03**. Godzina odpowiedzi. |
| Piątek | 02.10 | Wieczór (30 min) | **Ocena bramki fazy 1** na danych z arkusza — patrz niżej. Decyzja zapada dziś, nie w niedzielę, żeby zdążyć wpłynąć na jutrzejszy blok produkcyjny. |
| Sobota | 03.10 | Rano | Publikacja **A-13**. Godzina odpowiedzi. |
| Sobota | 03.10 | Dodatkowo | Wywiad #4 i #5 (jeśli się nie zmieściły wcześniej w tygodniu). |
| **Niedziela** | **04.10** | **140 min** | Blok na **tydzień 5**: zbuduj szablon **T4 (ekran w ramce)**. Wyprodukuj **D-01, D-02, D-03, D-06**. **Zawartość tego bloku zależy od wczorajszej bramki — patrz niżej.** |

#### 🚦 Bramka fazy 1 — oceniana w piątek 2 października

> **Czy któryś post przekroczył 2 000 wyświetleń?**
>
> **Tak** → niedzielny blok 4 października rusza zgodnie z planem (T4, D-01…D-06).
> **Nie** → problem jest w treści, nie w dystrybucji. Niedzielny blok **nie
> buduje jeszcze T4** — zamiast tego przerabiasz format trzech dotychczasowych
> hooków (skracasz do jednego zdania, pointę na początek) i publikujesz je
> ponownie w tygodniu 5 zamiast nowych D-01…D-06. T4 budujesz tydzień później.

---

## Faza 2 — Pierwsi użytkownicy · tygodnie 5–8 · 5 października – 1 listopada

Cel: 15 leadów, 5 nauczycieli z realnymi uczniami. **Od teraz wolno sprzedawać.**
Miks: 2×A, 1×B lub C, 1×D.

### Tydzień 5 · 5–11 października

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 05.10 | Rano | Publikacja **A-10**. Godzina odpowiedzi. |
| Wtorek | 06.10 | Wieczór (30 min) | **Trzydzieści dni dawania w grupach minęło.** Jeden szczery post „build in public" w każdej grupie z historią Twoich odpowiedzi. Skrypt w § 8 planu. Link w komentarzu, jeśli regulamin pozwala. |
| Środa | 07.10 | Rano | Publikacja **B-04**. Godzina odpowiedzi. |
| Czwartek | 08.10 | Wieczór (30 min) | Reddit — 1 odpowiedź. LinkedIn — nie w tym tygodniu (co drugi). |
| Piątek | 09.10 | Rano | Publikacja **D-01** — pierwszy klip produktowy w całej kampanii. |
| Piątek | 09.10 | Wieczór (30 min) | Arkusz. Od dziś śledzisz kolumnę leadów, nie tylko zasięg. |
| Sobota | 10.10 | Rano | Publikacja **A-05**. Godzina odpowiedzi. |
| Sobota | 10.10 | Dodatkowo | **Outreach start**: pierwsza połowa z 10 spersonalizowanych wiadomości tygodniowo. Bez linku w pierwszej wiadomości. |
| **Niedziela** | **11.10** | **140 min** | Blok na **tydzień 6**: **D-04, D-05, A-08, A-09**. |

### Tydzień 6 · 12–18 października

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 12.10 | Rano | Publikacja **A-08**. Godzina odpowiedzi. |
| Wtorek | 13.10 | Wieczór (30 min) | 10 wiadomości outreach. |
| Środa | 14.10 | Rano | Publikacja **C-05** — najbardziej kontrariański klip w banku („czego w Strummy nie ma"). Spodziewaj się więcej komentarzy niż zwykle, w tym krytycznych. |
| Czwartek | 15.10 | Wieczór (30 min) | Reddit — 1 odpowiedź · LinkedIn — 1 post. |
| Piątek | 16.10 | Rano | Publikacja **D-02**. |
| Piątek | 16.10 | Wieczór (30 min) | Arkusz. |
| Sobota | 17.10 | Rano | Publikacja **A-11**. |
| **Niedziela** | **18.10** | **140 min** | Blok na **tydzień 7**: **A-14, A-16, B-06, D-07**. |

> Od tego tygodnia obowiązuje standing task z sekcji wprowadzającej: rozmowa
> wideo z każdym leadem w ciągu 48h, bez wyjątków. **Filar E jest teraz
> odblokowany** — produkuj tylko to, co się faktycznie wydarzyło, nie na zapas.

### Tydzień 7 · 19–25 października

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 19.10 | Rano | Publikacja **A-09**. |
| Wtorek | 20.10 | Wieczór (30 min) | 10 wiadomości outreach. |
| Środa | 21.10 | Rano | Publikacja **B-06**. |
| Czwartek | 22.10 | Wieczór (30 min) | Reddit — 1 · LinkedIn — 1. |
| Piątek | 23.10 | Rano | Publikacja **D-03**. |
| Piątek | 23.10 | Wieczór (30 min) | Arkusz. |
| Sobota | 24.10 | Rano | Publikacja **A-14**. |
| **Niedziela** | **25.10** | **140 min** | Blok na **tydzień 8**: **B-07, B-09, D-08, C-06**. |

### Tydzień 8 · 26 października – 1 listopada

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 26.10 | Rano | Publikacja **A-16**. |
| Wtorek | 27.10 | Wieczór (30 min) | 10 wiadomości outreach. |
| Środa | 28.10 | Rano | Publikacja **B-07**. |
| Czwartek | 29.10 | Wieczór (30 min) | Reddit — 1 · LinkedIn — 1. |
| Piątek | 30.10 | Rano | Publikacja **D-06**. |
| Piątek | 30.10 | Wieczór (30 min) | Arkusz + **ocena bramki fazy 2** (patrz niżej) — zrobiona dziś, nie w niedzielę ani w Wszystkich Świętych. |
| Sobota | 31.10 | Rano | Publikacja **C-06**. |
| **Sobota** | **31.10** | **140 min** | **Blok produkcyjny na tydzień 9, przesunięty z niedzieli** (patrz uwaga wstępna #2): 3 warianty najlepszych klipów faz 1–2 + **B-10**. |
| Niedziela | 01.11 | — | **Wszystkich Świętych.** Żadnej produkcji ani publikacji. Jedyne zadanie: decyzja z bramki poniżej, na podstawie wczorajszych danych. |

#### 🚦 Bramka fazy 2 — oceniana w piątek 30 października, decyzja obowiązuje od 1 listopada

> **Czy pięciu nauczycieli wróciło do aplikacji w drugim tygodniu bez Twojego
> przypomnienia?**
>
> **Tak** → tydzień 9 rusza zgodnie z planem, outreach do szkół włącznie.
> **Nie, wracają tylko po pingu** → **problem produktowy, nie marketingowy.**
> Zatrzymaj outreach i kontakt ze szkołami w tygodniu 9. Publikuj nadal z
> bufora (masz go z soboty), ale nie dokładaj nowych leadów do produktu, który
> ich nie utrzymuje — to spala rynek, który masz raz. Wróć do outreachu dopiero
> gdy retencja się poprawi.

---

## Faza 3 — Skala i szkoły · tygodnie 9–12 · 2–29 listopada

Cel: 30 leadów łącznie, 10 aktywnych nauczycieli, 2–3 rozmowy ze szkołami.
Miks: 1×A, 1×B, 1×D, 1×E. Połowa produkcji to warianty zwycięzców z faz 1–2.

### Tydzień 9 · 2–8 listopada

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 02.11 | Rano | Publikacja **wariantu #1**. |
| Wtorek | 03.11 | Wieczór (30 min) | **Kontakt do 5 szkół** — skrypt w § 8 planu, z brakami produktu wypisanymi wprost. Maksymalnie dwie wejdą w pilotaż. |
| Środa | 04.11 | Rano | Publikacja **B-09**. |
| Czwartek | 05.11 | Wieczór (30 min) | Reddit — 1 · LinkedIn — 1. |
| Piątek | 06.11 | Rano | Publikacja **D-04**. |
| Piątek | 06.11 | Wieczór (30 min) | Arkusz. |
| Sobota | 07.11 | Rano | Publikacja **E-01**, jeśli masz prawdziwy materiał (pierwsza wiadomość od obcego nauczyciela, za zgodą autora). Jeśli nie — kolejny wariant zamiast E-01. |
| **Niedziela** | **08.11** | **140 min** | Blok na **tydzień 10**: 3 warianty + **B-11**. |

### Tydzień 10 · 9–15 listopada

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 09.11 | Rano | Publikacja **wariantu #2**. |
| Poniedziałek | 09.11 | Dodatkowo | **Start testu płatnego (opcjonalnie)**: 30 zł/dzień na jedną kreację, która już zadziałała organicznie — nigdy na nową. Biegnie 10 dni, do środy 18 listopada (tydzień 11). |
| Wtorek | 10.11 | Wieczór (30 min) | Follow-up ze szkołami kontaktowanymi w tygodniu 9. |
| Środa | 11.11 | Rano | Publikacja **B-10**. *(Narodowe Święto Niepodległości — dzień wolny, więcej osób scrolluje niż zwykle w środę; nie przesuwaj.)* |
| Czwartek | 12.11 | Wieczór (30 min) | Reddit — 1 · LinkedIn — 1. |
| Piątek | 13.11 | Rano | Publikacja **D-05**. |
| Piątek | 13.11 | Wieczór (30 min) | Arkusz + sprawdzenie testu płatnego (5. dzień z 10). |
| Sobota | 14.11 | Rano | Publikacja **E-02**, jeśli masz materiał, inaczej wariant. |
| **Niedziela** | **15.11** | **140 min** | Blok na **tydzień 11**: 3 warianty + **B-12**. |

### Tydzień 11 · 16–22 listopada

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 16.11 | Rano | Publikacja **wariantu #3**. |
| Poniedziałek | 16.11 | Dodatkowo | Jeśli pilotaż szkolny rusza w tym tygodniu: **ograniczenia produktu spisane w mailu, wysłane przed startem**, nie po. |
| Wtorek | 17.11 | Wieczór (30 min) | Onboarding pilotażu z maksymalnie dwiema szkołami. |
| Środa | 18.11 | Rano | Publikacja **B-11**. |
| Środa | 18.11 | Dodatkowo | Koniec testu płatnego z tygodnia 10 (10. dzień). Zapisz wynik w arkuszu, zanim go zapomnisz. |
| Czwartek | 19.11 | Wieczór (30 min) | Reddit — 1 · LinkedIn — 1. |
| Piątek | 20.11 | Rano | Publikacja **D-07**. |
| Piątek | 20.11 | Wieczór (30 min) | Arkusz. |
| Sobota | 21.11 | Rano | Publikacja **E-03**, jeśli masz materiał, inaczej wariant. |
| **Niedziela** | **22.11** | **140 min** | Blok na **tydzień 12**: brak nowego szablonu, ostatnie domknięcie — **wariant #4, C-08 lub E-04**, w zależności co jest dostępne. |

### Tydzień 12 · 23–29 listopada

| Dzień | Data | Blok | Zadanie |
| :--- | :--- | :--- | :--- |
| Poniedziałek | 23.11 | Rano | Publikacja **wariantu #4**. |
| Wtorek | 24.11 | Wieczór (30 min) | Domknięcie rozmów ze szkołami — status pilotaży, nie nowy outreach. |
| Środa | 25.11 | Rano | Publikacja **B-12**. |
| Czwartek | 26.11 | Wieczór (30 min) | Ostatnie odpowiedzi na Reddicie i LinkedIn tego kwartału. |
| Piątek | 27.11 | Rano | Publikacja **D-08**. |
| **Piątek** | **27.11** | **60 min** | **Pełne podsumowanie kwartału** względem celów z § 7 planu — nie zwykłe 30 minut, tym razem podwójny czas: wszystkie metryki, wszystkie fazy, decyzja z bramki poniżej. |
| Sobota | 28.11 | Rano | Publikacja **C-08** (jeśli zdarzenie „pierwszy nauczyciel spoza studia" już zaszło) **lub E-04** (rocznicowe zestawienie). |
| **Niedziela** | **29.11** | — | Blok produkcyjny **nie jest potrzebny** — kwartał się kończy, nie ma tygodnia 13. Zamiast tego: przeczytaj wynik bramki fazy 3 i zaplanuj następny kwartał na jej podstawie. |

#### 🚦 Bramka fazy 3 — oceniana w piątek 27 listopada

| Wynik | Znaczenie | Co dalej |
| :--- | :--- | :--- |
| Zasięg jest, leadów nie ma | filar A dociera do gitarzystów, nie do nauczycieli | przesuń miks w stronę B, zawęź hooki do języka nauczycielskiego |
| Leady są, aktywacji nie ma | problem produktowy | zatrzymaj marketing, napraw onboarding |
| Jedno i drugie jest | działa | podnieś wolumen albo wejdź w płatne szerzej; rozważ wyjście z trybu bezosobowego (bank, § 3) |
| Ani jedno, ani drugie | kanał nie zadziałał w tej formie | nie dokładaj czwartego miesiąca tego samego; wróć do grup FB i outreachu, które nie zależą od algorytmu |

---

## Skrzynka na kolizje — dni, na które warto uważać

| Data | Co się nakłada | Decyzja |
| :--- | :--- | :--- |
| Sob 05.09 / Nd 06.09 | brakująca produkcja startowa | wykonana teraz w sobotę+niedzielę tygodnia 0 — patrz wyżej |
| Pt 02.10 | bramka fazy 1 + zwykły piątkowy pomiar | jeden blok 30+ min zamiast dwóch osobnych |
| Pt 30.10 / Nd 01.11 | bramka fazy 2 + Wszystkich Świętych + produkcja tygodnia 9 | produkcja przesunięta na sobotę 31.10, decyzja w piątek, niedziela wolna |
| Śr 11.11 | publikacja + Święto Niepodległości | zostaje bez zmian, dzień wolny sprzyja zasięgowi |
| Pon 09.11 – Śr 18.11 | test płatny (10 dni) krzyżuje granicę tygodnia 10/11 | koniec testu zapisany osobno w tygodniu 11, żeby nie zgubić wyniku |
| Pt 27.11 | podsumowanie kwartału + zwykły piątkowy pomiar | jeden podwójny blok (60 min) zamiast dwóch |
