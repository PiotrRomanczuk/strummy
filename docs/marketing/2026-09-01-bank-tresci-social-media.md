# Bank treści: 48 klipów animowanych

**Data**: 2026-09-01 (tryb bez wizerunku: 2026-09-02)
**Dokument nadrzędny**: `2026-09-01-social-media-go-to-market.md` § 5 (silnik treści)
**Tryb produkcji**: wszystko generowane. Bez wizerunku założyciela przez pierwsze
1–3 miesiące — bez twarzy, bez rąk, bez głosu.
**Cel**: usunąć jedyny krok, na którym plan realnie stanie — moment, w którym
trzeba wymyślić, co wyprodukować.

Każdy wpis ma numer, hook, rozpisaną strukturę co do sekundy, specyfikację
animacji i tekst na ekran. Wybierasz sześć numerów, generujesz, renderujesz,
publikujesz.

---

## 0. Ograniczenie i co z niego wynika

**Przyjęte założenie**: przez pierwsze trzy miesiące w kadrze nie ma Ciebie —
ani obrazu, ani głosu, ani nagranej przez Ciebie gitary. Wszystko powstaje
generatywnie. Reszta dokumentu jest napisana pod ten warunek.

Jeśli w którymś momencie zgodzisz się na **sam dźwięk gitary** nagrany telefonem
(to nie jest wizerunek — to instrument), filar A rośnie natychmiast i bez
przebudowy. Zaznaczam przy każdym numerze, gdzie to robi różnicę.

### Co ten tryb zabiera, a co daje

Uczciwie w obie strony, bo bilans nie jest jednostronny.

| | |
| :--- | :--- |
| **Traci** | Argument „zbudował to praktykujący nauczyciel" przestaje być pokazywany, a zaczyna być tylko twierdzony. Konkurent z budżetem odtworzy taki kanał w kwadrans. |
| **Traci** | Filar C w wersji „opowiadam o sobie" przestaje działać — patrz przebudowa niżej. |
| **Zyskuje** | Znika najczęstszy powód porzucania kanałów: opór przed byciem w kadrze. Kanał, który powstaje, bije kanał, który miałby być lepszy. |
| **Zyskuje** | Produkcja skaluje się liniowo. Osiem klipów jednego wieczoru jest realne, ośmiu nagrań nie. |
| **Zyskuje** | Nie ma zależności od światła, tła, formy dnia ani miejsca. Robisz to w pociągu. |
| **Zyskuje** | Gitarowa nisza ma duże, działające konta bez twarzy. To nie jest eksperyment. |
| **Zyskuje** | Decyzja jest odwracalna, a odwrócenie jest samo w sobie mocnym materiałem — patrz § 4. |

### Zasada, która zastępuje twarz

Skoro nie możesz **pokazać** człowieka, musisz **pokazać dowody**. Nie „jestem
nauczycielem, zaufaj mi", tylko rzeczy publiczne, sprawdzalne i datowane:

- publiczne repozytorium z historią commitów,
- lista wydań z datami i tempem,
- działający produkt na nagraniu ekranu,
- pisany tekst w pierwszej osobie, podpisany imieniem.

**Tekst podpisany imieniem nie jest wizerunkiem.** Zdanie „uczę gitary
w Warszawie, mam dwudziestu uczniów" napisane na ekranie niesie autorstwo bez
pokazywania autora. To jest Twój nośnik pierwszej osoby przez najbliższe trzy
miesiące i cała przebudowa filaru C stoi na tym rozróżnieniu.

### Czego nie robić, żeby nie wyjść na farmę treści

**Nie używaj syntetycznego lektora.** To jest największa pułapka tego trybu.
Głos TTS w niszy, gdzie nauczyciel mówi do nauczyciela, czyta się natychmiast
jako treść masowa i kosztuje więcej zaufania, niż daje zasięgu. Lepsza jest
cisza z mocną typografią niż sztuczny głos.

**Nie udawaj, że w kadrze ktoś jest.** Żadnych stockowych rąk na gryfie, żadnych
zdjęć „założyciela" z generatora. Anonimowość jest uczciwa, podszywanie się nie.

**Nie ukrywaj, że kanał jest bezosobowy z wyboru.** Bio może mówić wprost, kto
za tym stoi, nawet jeśli klipy tego nie pokazują. Link do repozytorium i
changeloga załatwia wiarygodność lepiej niż selfie.

### Dźwięk

Bez lektora i bez nagranej gitary zostają trzy opcje, w tej kolejności:

1. **Sample gitary sterowane z MIDI.** Dla wszystkiego, co pokazuje **relacje
   wysokości** — interwały, skale, akordy — czysty sampel jest równie dobry,
   a często czytelniejszy niż nagranie w pokoju. To pokrywa większość filaru A.
2. **Cisza z mocną typografią.** Dla filarów B, C i E dźwięk i tak nie niesie
   treści. Większość i tak ogląda bez niego.
3. **Podkład bez wokalu, bardzo cicho.** Tylko tam, gdzie cisza byłaby dziwna.
   Nigdy pod klipem, w którym słychać gitarę.

Dwa numery tracą na sampelach wyraźnie, bo żyją z **czucia**, a nie z wysokości
dźwięku: **A-13** (cztery rytmy) i **A-11** (blues). Zrób je później albo
przyjmij, że będą słabsze niż reszta filaru.

---

## 1. Ścieżka produkcji

**Claude Design nie wyeksportuje wideo.** Canvas składa artboardy `.dc.html`
i oddaje PNG oraz PDF. To wystarcza do karuzel i grafik statycznych, ale Reels,
TikTok i Shorts chcą pliku wideo 9:16. Potrzebna jest jedna warstwa więcej.

### Ścieżka rekomendowana: animowany HTML → Playwright → wideo

Pasuje do Ciebie lepiej niż jakikolwiek edytor wideo, bo to jest kod, a nie
przeciąganie klatek na osi czasu.

1. **Jeden klip to jeden plik HTML** w formacie 1080×1920, z animacją na
   keyframe'ach CSS i licznikiem czasu. Claude Design albo zwykły artefakt
   generuje ten plik.
2. **Renderujesz przeglądarką.** Repo ma już `playwright.video.config.ts`
   z `video: 'on'` — potrzebny jest wariant z viewportem `1080×1920`,
   `video.size` ustawionym na to samo i bez `webServer`, bo klipy to pliki
   lokalne, nie aplikacja. Spec otwiera plik, czeka długość klipu i kończy.
3. **Webm z Playwrighta konwertujesz do mp4** ffmpegiem na Macu. Instagram
   przyjmie webm niechętnie, TikTok wcale.
4. **Dźwięk podkładasz na końcu** w CapCut albo ffmpegiem. Napisy generuje
   CapCut, korekta ręczna dla „pentatonika" i „Strummy".

Zaletą jest powtarzalność: raz zrobiony szablon renderuje kolejne klipy jedną
komendą, a poprawka typografii we wszystkich czterdziestu ośmiu to jedna zmiana
w CSS. Filmowanie takiej własności nie ma.

**Nie mam tego harnessu zbudowanego** — to konfiguracja i spec, czyli zmiana
w kodzie, a ten PR jest dokumentacyjny. Powiedz słowo, dorobię go osobno.

### Ścieżka zapasowa: canvas → PNG → CapCut

Jeśli chcesz zacząć dziś, bez pisania czegokolwiek: generuj w Claude Design
sekwencję artboardów jako klatki kluczowe, eksportuj PNG, składaj w CapCut
z przejściami. Wolniejsze przy każdym kolejnym klipie i nie da płynnego ruchu,
ale nie wymaga ani jednej linii kodu.

### Pięć szablonów zamiast czterdziestu ośmiu projektów

Tu jest cała ekonomia tego podejścia. Animacja opłaca się dopiero wtedy, gdy
klip jest **treścią wstawioną w szablon**, a nie osobnym projektem graficznym.
Zbuduj pięć szablonów raz i każdy kolejny klip to podmiana danych:

| Szablon | Dla filaru | Co robi |
| :--- | :--- | :--- |
| **T1 — Gryf** | A | interaktywny gryf ze Strummy w pionie, dźwięki zapalają się w sekwencji, etykiety interwałów, kształt przesuwa się po szyjce |
| **T2 — Diagram akordu** | A | siatka progów, kropki palców, animowane dodawanie i zdejmowanie palca |
| **T3 — Scena tekstowa** | B, C | typografia kinetyczna na tle w kolorach Strummy, elementy dokładają się warstwami, licznik |
| **T4 — Ekran w ramce** | D, E | nagranie ekranu aplikacji w ramce telefonu, kursor spowolniony, podświetlenia |
| **T5 — Zestawienie** | B, E | dwie kolumny „przed / po", odsłaniane naprzemiennie |

Szablony biorą tokeny z `app/design-tokens.css` — paleta paper, ink i gold jest
już zdefiniowana i klipy będą wyglądać jak produkt, a nie jak stock.

---

## 2. Jak używać banku

**Blok produkcyjny zastępuje blok nagraniowy** i ma inną ekonomię. Filmowanie
kosztowało 90 minut na dwa tygodnie niezależnie od liczby klipów. Generowanie
kosztuje dużo przy pierwszym klipie z danego szablonu i mało przy każdym
kolejnym. Dlatego **grupuj po szablonach, nie po tygodniach**: zrób osiem klipów
na T1 za jednym razem, nawet jeśli wystarczą na miesiąc.

**Miks tygodniowy** trzyma proporcję trzy wartościowe na jeden produktowy:

| Faza | A (teoria) | B (ból) | C (kulisy) | D (produkt) | E (dowód) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Dni 1–30 | 2 | 1 | 1 | 0 | 0 |
| Dni 31–60 | 2 | 1 | 0 | 1 | 0 |
| Dni 61–90 | 1 | 1 | 0 | 1 | 1 |

Filar C zostaje w miksie — w trybie bezosobowym został przebudowany na dowody
publiczne i działa, patrz jego sekcja.

### Zasady, które decydują o zasięgu

**Pierwsza sekunda albo nic.** Hook musi być na ekranie jako tekst i w dźwięku.
Nie zaczynaj od nazwy produktu, od „cześć", ani od „dzisiaj pokażę". W animacji
kusi, żeby otworzyć planszą tytułową — to jest najdroższy z możliwych sposobów
na stratę połowy widowni. Pierwsza klatka to już treść.

**Pokaż zanim powiesz.** W filarze A dźwięk gitary leci w pierwszej sekundzie,
etykieta interwału pojawia się dopiero po tym, jak widz usłyszał.

**Jedna myśl na klip.** Jeśli w trakcie pisania pojawia się „a przy okazji", to
jest osobny numer w banku.

**Ruch służy zrozumieniu, nie ozdobie.** To jest pułapka specyficzna dla
animacji, której filmowanie nie ma. Każde przejście ma pokazywać zależność —
dźwięk zapala się, bo należy do skali; kształt przesuwa się, bo zmienia się
tonacja. Efekt bez znaczenia czyta się jak reklama i widz przewija.

**Napisy zawsze**, większość ogląda bez dźwięku.

**CTA tylko w filarze D.** W A, B i C nie ma wezwania do działania poza
zaproszeniem do komentarza.

**Format**: 1080×1920, 20–40 sekund, jeden plik na trzy platformy.

### Pierwsze cztery bloki produkcyjne

Dobrane tak, żeby każdy blok zamykał jeden szablon, a nie mieszał pięciu.

| Blok | Numery | Szablon do zbudowania |
| :--- | :--- | :--- |
| 1 | A-01, A-03, A-06, A-15 | **T1 — Gryf**, cztery klipy z jednego szablonu |
| 2 | B-01, B-03, C-02, C-01 | **T3 — Scena tekstowa** |
| 3 | A-04, A-07, A-13 | **T2 — Diagram akordu** |
| 4 | D-01, D-02, D-06 | **T4 — Ekran w ramce**, nagrania z demo studia |

---

## 3. Wyjście z trybu bezosobowego

Powiedziałeś „miesiąc albo trzy", więc traktuję to jako etap, nie jako docelowy
kształt kanału. Dwie rzeczy warto rozstrzygnąć teraz, bo później są droższe.

**Buduj tak, żeby przejście nic nie kosztowało.** Szablony T1–T5 nie zakładają
człowieka w kadrze, ale też go nie wykluczają — zostaw w T3 pustą warstwę na
wideo w rogu. Wtedy dołożenie twarzy w trzecim miesiącu to zmiana jednego
szablonu, a nie przebudowa banku.

**Wyjście jest materiałem, nie tylko zmianą.** Konto, które przez trzy miesiące
dawało wartość bez pokazywania autora, ma jedną rzecz, której konto z twarzą od
pierwszego dnia nigdy nie będzie miało: moment ujawnienia z gotową publicznością.
To jest mocny numer sam w sobie — „przez trzy miesiące pokazywałem wam gryf, dziś
pokażę, kto to robił i po co". Zaplanuj go jako C-09, ale nie produkuj wcześniej.

**Kryterium, nie data.** Nie przechodź po kalendarzu, tylko gdy zajdzie
którekolwiek z tych zdarzeń, bo każde z nich znaczy, że anonimowość zaczęła
kosztować więcej, niż daje:

- pierwsza rozmowa ze szkołą, gdzie i tak przedstawiasz się osobiście,
- powtarzające się pytania w komentarzach, kto za tym stoi,
- filar C wyczerpany, bo publiczne dowody są skończone i się powtarzają,
- zasięg jest, a leady nie idą — po wyczerpaniu poprawek z § 11 planu.

Jeśli po trzech miesiącach żadne nie zaszło, tryb bezosobowy działa i nie ma
powodu go kończyć.

---

## Filar A — 30 sekund teorii

**Rola**: zasięg. Jedyny filar, który dociera poza nauczycieli, do całej
populacji gitarzystów. Kilka procent z nich uczy.

**Produkcja**: szablony T1 i T2. Ten filar na animacji **wygrywa** z nagraniem:
zapalający się interwał na czystym gryfie jest czytelniejszy niż palec
zasłaniający próg. Dźwięk z sampli gitary sterowanych z MIDI — dla relacji
wysokości to wystarcza w zupełności, a bywa czystsze niż nagranie w pokoju.
Wyjątki, które żyją z czucia, a nie z wysokości: **A-11** i **A-13**.

**A-01 · Pięć pozycji pentatoniki to zły sposób uczenia** `35 s` `T1`
Hook: „Uczono cię pentatoniki w pięciu pudełkach. Dlatego do dziś nie umiesz z niej wyjść."
Struktura: 0–4 s szybki lick, gryf pokazuje tylko zagrane dźwięki · 4–12 s pięć boxów wjeżdża kolejno i zostaje na ekranie jako ściana · 12–28 s boxy gasną, zostają dwa kształty interwałowe, które przesuwają się przez trzy pozycje bez cięcia · 28–35 s domknięcie.
Animacja: pięć prostokątów nakłada się na gryf z opóźnieniem 0,3 s każdy, potem wygaszenie do 15% i podświetlenie dwóch kształtów, które jadą po szyjce jednym płynnym ruchem.
Na ekran: „5 pudełek" przekreślone → „2 kształty".

**A-02 · Jeden interwał, który otwiera cały gryf** `30 s` `T1`
Hook: „Znasz jeden dźwięk. Ten interwał daje ci resztę."
Struktura: 0–3 s kwinta czysta · 3–15 s jej kształt przesuwa się przez gryf · 15–27 s to samo z tercją małą i wielką, słychać dur i moll · 27–30 s domknięcie.
Animacja: dwie kropki na sąsiednich strunach, między nimi łuk z etykietą interwału; para sunie po gryfie utrzymując kształt.
Na ekran: nazwa interwału pojawia się po dźwięku, nie przed.

**A-03 · Dwa kształty oktawy i znasz każdy dźwięk na gryfie** `35 s` `T1`
Hook: „Nie musisz uczyć się nazw dźwięków na gryfie. Musisz znać dwa kształty."
Struktura: 0–4 s pytanie „gdzie jest F na strunie G?" · 4–18 s kształt pierwszy, struna 6 → 4 i 5 → 3, dwa progi w górę · 18–30 s kształt drugi, struny 4 → 2 i 3 → 1, trzy progi, bo struna H łamie strój · 30–35 s ta sama nazwa zapala się w czterech miejscach naraz.
Animacja: duch kształtu przesuwa się skokowo, licznik „+2" i „+3" przy przeskoku; finał to cztery jednoczesne podświetlenia.
Na ekran: „+2 progi" / „+3 progi, bo H".

**A-04 · Akord G jest trudniejszy, niż myślisz** `30 s` `T2`
Hook: „G to nie jest akord dla początkującego. Uczymy go za wcześnie."
Struktura: 0–4 s pełne G, cztery kropki lądują na diagramie · 4–14 s podświetlenie miejsc, gdzie ręka początkującego się łamie · 14–26 s wersja trzypalcowa i G5 obok, w utworze brzmią tak samo · 26–30 s domknięcie.
Animacja: diagram akordu, kropki palców wpadają po kolei; przy problematycznych rozchodzi się czerwony pierścień. Trzy warianty ustawione obok siebie na końcu.
Na ekran: „pełne G" / „to samo w utworze".

**A-05 · CAGED bez ani jednego słowa teorii** `40 s` `T1`
Hook: „Pięć akordów, które już znasz, to pięć pozycji każdego akordu na gryfie."
Struktura: 0–5 s C w otwartej pozycji · 5–30 s ten sam kształt jedzie przez gryf, przy każdej pozycji zmienia się litera akordu · 30–40 s domknięcie.
Animacja: jeden ciągły ruch kształtu po szyjce bez cięć, litera akordu przeskakuje w rytm; nazwa systemu nie pada ani razu.
Na ekran: litera akordu przy każdej pozycji.

**A-06 · Ta sama skala w pięciu tonacjach — co się właściwie zmienia** `30 s` `T1`
Hook: „Nie ma pięciu skal do nauczenia. Jest jedna i pięć miejsc startu."
Struktura: 0–4 s fraza w A · 4–20 s ta sama fraza w C, D, F, G, kształt niezmieniony · 20–30 s domknięcie.
Animacja: kształt skali sztywny, przesuwa się tylko w poziomie; marker roota pulsuje przy każdej zmianie, licznik progu w rogu.
Na ekran: tonacja i numer progu przy każdym powtórzeniu.

**A-07 · Akord, który brzmi drogo, a jest łatwiejszy niż durowy** `30 s` `T2`
Hook: „Ten akord brzmi jak z płyty. Zdejmujesz jeden palec."
Struktura: 0–3 s zwykłe D · 3–8 s Dadd9 · 8–22 s przejścia tam i z powrotem · 22–30 s czterotaktowa progresja z add9.
Animacja: jedna kropka na diagramie unosi się i znika, reszta bez ruchu. Cała pointa to jeden element, który odjeżdża.
Na ekran: „D" → „Dadd9 · jeden palec mniej".

**A-08 · Tercje na sąsiednich strunach to cała harmonia** `35 s` `T1`
Hook: „Dwie struny wystarczą, żeby zagrać harmonię do wszystkiego."
Struktura: 0–4 s melodia jednogłosowo · 4–20 s dołącza drugi głos na sąsiedniej strunie · 20–35 s widać, kiedy tercja jest mała, a kiedy wielka.
Animacja: pierwszy głos jako ciąg kropek wzdłuż struny, drugi dorysowuje się równolegle z opóźnieniem pół sekundy; odległość między nimi ma stałą etykietę.
Na ekran: „1 głos" → „2 głosy".

**A-09 · Dorycki w dziesięć sekund, bez teorii** `30 s` `T1`
Hook: „Zagraj moll. Teraz podnieś jeden dźwięk o pół tonu. To jest cały tryb dorycki."
Struktura: 0–5 s fraza w molu naturalnym · 5–15 s seksta idzie w górę o pół tonu · 15–26 s obie wersje nad tym samym basem · 26–30 s domknięcie.
Animacja: cała skala szara, jeden dźwięk przeskakuje o próg i zmienia kolor na złoty. Nic więcej się nie rusza.
Na ekran: „moll" / „+ jeden dźwięk".

**A-10 · Dlaczego wszyscy gubią się przy strunie H** `30 s` `T1`
Hook: „Twój kształt przestaje działać na przedostatniej strunie. To nie twoja wina."
Struktura: 0–4 s kształt, który się rozjeżdża · 4–18 s strój idzie kwartami poza jednym miejscem, gdzie jest tercja · 18–27 s korekta o jeden próg · 27–30 s domknięcie.
Animacja: linijka interwałów między strunami wjeżdża z boku jako „4 · 4 · 4 · 3 · 4"; wyróżniona trójka pulsuje, kształt łamie się dokładnie na niej.
Na ekran: „4 · 4 · 4 · 3 · 4".

**A-11 · Co ta jedna septyma robi z bluesem** `35 s` `T1`
Hook: „Trzy akordy to jeszcze nie blues. Brakuje jednego dźwięku."
Struktura: 0–6 s dwanaście taktów na czystych durowych · 6–20 s septyma mała dołącza do każdego · 20–35 s gdzie ten dźwięk leży w każdym z trzech akordów.
Animacja: trzy bloki akordowe w rzędzie, w każdym po kolei zapala się jeden dodatkowy dźwięk; przebieg leci na pasku postępu pod spodem.
Na ekran: „dur" → „dominanta".

**A-12 · Barré nie wymaga siły** `35 s` `T2`
Hook: „Jeśli barré cię boli, ściskasz. A ściskanie jest złą techniką."
Struktura: 0–4 s czyste F · 4–16 s pozycja kciuka z tyłu gryfu i kierunek siły · 16–30 s zła pozycja dla kontrastu · 30–35 s domknięcie.
Animacja: przekrój szyjki z boku — to jest ujęcie, którego kamera prawie nigdy nie pokazuje, a rysunek pokazuje bez trudu. Wektor siły jako strzałka od przedramienia, nie od palca.
Na ekran: „kciuk na środku" / „przedramię, nie palec".
Uwaga: ten numer na animacji jest **lepszy** niż byłby na wideo. Warto zrobić go wcześnie.

**A-13 · Jeden akord, cztery rytmy, cztery gatunki** `30 s` `T2`
Hook: „Ten sam akord. Rytm decyduje, czy to folk, czy funk."
Struktura: 0–3 s Am prosto · 3–27 s cztery różne rytmy na tym samym chwycie, po sześć sekund · 27–30 s domknięcie.
Animacja: diagram akordu nieruchomy przez cały klip, pod nim pasek rytmiczny z uderzeniami w górę i w dół, który przerysowuje się przy każdej zmianie. Bezruch u góry robi całą robotę.
Na ekran: nazwa charakteru przy każdym rytmie.

**A-14 · Test: nazwij ten dźwięk w dwie sekundy** `20 s` `T1`
Hook: „Siódmy próg, struna D. Dwie sekundy."
Struktura: 0–3 s pytanie i marker na progu · 3–8 s odliczanie · 8–14 s odpowiedź i droga do niej od pustej struny · 14–20 s drugie pytanie bez odpowiedzi.
Animacja: gryf statyczny, jeden marker, duży licznik. Przy odpowiedzi ścieżka od pustej struny podświetla się próg po progu.
Na ekran: licznik 2 · 1 · 0, potem odpowiedź; drugie pytanie zostaje na końcu.

**A-15 · Pentatonika molowa i durowa to ten sam kształt** `30 s` `T1`
Hook: „Nie musisz uczyć się durowej pentatoniki. Już ją znasz."
Struktura: 0–5 s A-moll pentatonika na piątym progu · 5–18 s ten sam kształt, punkt ciężkości przesuwa się o trzy progi, bas gra C · 18–30 s obie nad odpowiednim basem.
Animacja: kształt bez ruchu, przesuwa się wyłącznie marker roota; tło zmienia odcień razem z basem, żeby widać było, że zmienił się kontekst, nie palce.
Na ekran: „A-moll" ↔ „C-dur · ten sam kształt".

**A-16 · Kwarta i tryton nad tym samym basem** `30 s` `T1`
Hook: „Jeden próg różnicy między spokojem a niepokojem."
Struktura: 0–5 s kwarta nad basem · 5–15 s podniesienie o pół tonu · 15–27 s oba naprzemiennie w rytmie · 27–30 s domknięcie.
Animacja: dwa dźwięki, jeden przeskakuje o próg; pod spodem pasek basu jako stała linia. Nazwa interwału pojawia się z opóźnieniem, po tym jak widz usłyszy.
Na ekran: nazwy interwałów po dźwięku.

---

## Filar B — Czwartek nauczyciela

**Rola**: identyfikacja. To są klipy, które nauczyciele zapisują i wysyłają
sobie nawzajem. Zapis jest silniejszym sygnałem dla algorytmu niż polubienie.

**Produkcja**: szablony T3 i T5. Bez twarzy ten filar traci ton zwierzenia,
więc **ciężar przenosi się na tekst**. Zdania muszą być krótsze i twardsze niż
byłyby wypowiedziane — typografia nie wybacza rozwlekłości. Pisz w pierwszej
osobie i podpisuj imieniem: to jest nośnik autorstwa, który zostaje, gdy nie ma
ani twarzy, ani głosu. Bez lektora, bez wyjątków.

**B-01 · Sześć wątków, żeby przypomnieć sobie jedną lekcję** `30 s` `T3`
Hook: „Zanim wejdzie uczeń, przeszukuję sześć rozmów na WhatsAppie."
Struktura: 0–5 s hook · 5–20 s sześć źródeł wymienionych po kolei: wątek z uczniem, wątek z rodzicem, notatka głosowa, zdjęcie zeszytu, mail z tabem, notatka w telefonie · 20–30 s domknięcie.
Animacja: dymki rozmów wpadają jeden po drugim i układają się w stos, który wychodzi poza kadr; licznik w rogu dobija do sześciu.
Na ekran: licznik wątków.

**B-02 · Godziny, za które nikt ci nie płaci** `30 s` `T5`
Hook: „Uczę dwadzieścia godzin tygodniowo. Pracuję dwadzieścia sześć."
Struktura: 0–5 s hook · 5–22 s rozbicie sześciu godzin na zadania · 22–30 s suma miesięczna.
Animacja: słupek dwudziestu godzin stoi od początku, na nim dokładają się warstwy admina, aż słupek przekracza linię „za to ci płacą".
Na ekran: rosnąca lista, na końcu suma.

**B-03 · Pierwsze dziesięć minut lekcji tracisz na siebie** `25 s` `T3`
Hook: „Pierwsze dziesięć minut lekcji to nie jest lekcja."
Struktura: 0–4 s hook · 4–16 s pytasz, on nie pamięta, ty nie pamiętasz, szukacie razem · 16–25 s mnożenie przez cztery lekcje dziennie.
Animacja: tarcza zegara, wycinek dziesięciu minut odcina się i powiela cztery razy, składając w blok czterdziestu minut.
Na ekran: „10 min × 4 lekcje = 40 min dziennie".

**B-04 · Rodzic pyta, jak idzie. Improwizujesz** `30 s` `T3`
Hook: „Rodzic pyta, jak idzie jego dziecku. Zmyślam odpowiedź i wiem o tym."
Struktura: 0–6 s hook · 6–20 s to nie kłamstwo, tylko brak zapisu · 20–30 s a rodzic płaci właśnie za to, żeby wiedzieć.
Animacja: dymek pytania od rodzica, obok pusty dymek odpowiedzi z migającym kursorem, który nic nie pisze. Cisza wizualna jest tu treścią.
Na ekran: „wrażenie ≠ postęp".

**B-05 · Gdzie jest tabulatura, którą obiecałeś trzy tygodnie temu** `25 s` `T3`
Hook: „Obiecałem Karolowi tabulaturę trzy tygodnie temu. Karol nadal czeka."
Struktura: 0–5 s hook · 5–18 s gdzie ona może być: zakładki, wysłane, notatka, drugi komputer · 18–25 s domknięcie.
Animacja: kalendarz odlicza dwadzieścia jeden dni w dwie sekundy, potem cztery miejsca przeszukiwania zapalają się i gasną bez rezultatu.
Na ekran: „nie zapomniałem — nie mam gdzie".

**B-06 · Trzech uczniów gra to samo, każdy gdzie indziej** `30 s` `T5`
Hook: „Trzy osoby grają Blackbirda. Jedna jest w połowie, jedna utknęła, jedna skończyła."
Struktura: 0–6 s hook · 6–22 s cała ta różnica siedzi w głowie razem z siedemnastoma innymi uczniami · 22–30 s domknięcie.
Animacja: trzy paski postępu przy trzech imionach, zatrzymane w różnych miejscach; potem dochodzi siedemnaście kolejnych pasków, za małych, żeby je odczytać.
Na ekran: trzy imiona, trzy etapy.

**B-07 · Uczeń wraca po dwóch miesiącach** `30 s` `T3`
Hook: „Uczeń wraca po dwóch miesiącach przerwy. Zaczynamy od zera, bo tak jest łatwiej niż sprawdzić."
Struktura: 0–6 s hook · 6–22 s co powinno się stać: wrócić do trzech utworów, które umiał, i jednego, który go zatrzymał · 22–30 s domknięcie.
Animacja: oś czasu z dziurą; utwory po lewej blakną w trakcie przerwy, ale nie znikają — i to jest pointa.
Na ekran: „2 miesiące przerwy" → „ile z tego trzeba powtórzyć?".

**B-08 · Jeden zeszyt, dwudziestu uczniów** `25 s` `T5`
Hook: „Mam jeden zeszyt i dwudziestu uczniów. Widzisz problem."
Struktura: 0–5 s hook · 5–16 s brak dat, brak nazwisk, dwie lekcje na jednej stronie · 16–25 s domknięcie.
Animacja: jeden zeszyt po lewej, dwadzieścia awatarów po prawej, wszystkie strzałki zbiegają się w ten sam punkt i się zatykają.
Na ekran: „zeszyt ≠ system".

**B-09 · Nie wiesz, ile zajmie coś, czego uczyłeś dwadzieścia razy** `30 s` `T3`
Hook: „Nowy uczeń pyta, ile zajmie mu barré. Uczyłem tego dwadzieścia razy i nie umiem odpowiedzieć."
Struktura: 0–7 s hook · 7–22 s dwadzieścia obserwacji i zero danych · 22–30 s mógłbyś odpowiadać z faktów, nie z uprzejmości.
Animacja: dwadzieścia ikon uczniów zapala się kolejno, obok licznik danych stoi na zerze przez cały klip.
Na ekran: „20 uczniów · 0 danych".

**B-10 · Odwołana lekcja w niedzielę wieczorem** `30 s` `T3`
Hook: „Odwołanie przychodzi w niedzielę o dwudziestej drugiej. Zaczyna się pięć wiadomości."
Struktura: 0–6 s hook · 6–22 s ustalanie terminu, kolizja z innym uczniem, dwie zmiany · 22–30 s za darmo, po godzinach.
Animacja: wątek rośnie o kolejne dymki, w tle siatka kalendarza z czerwoną kolizją, która przeskakuje przy każdej propozycji.
Na ekran: licznik wiadomości.

**B-11 · Koniec miesiąca i pytanie, kto ile miał lekcji** `25 s` `T3`
Hook: „Koniec miesiąca. Ile lekcji miała Zosia? Naprawdę nie wiem."
Struktura: 0–5 s hook · 5–18 s odtwarzanie miesiąca z kalendarza i pamięci, dwa przypadki sporne · 18–25 s liczysz to raz w miesiącu i za każdym razem od nowa.
Animacja: siatka miesiąca, część dni z pewnym znacznikiem, część ze znakiem zapytania, który pulsuje.
Na ekran: „4 lekcje? 5?".

**B-12 · Nie wiesz, kto za miesiąc zrezygnuje** `30 s` `T5`
Hook: „Uczeń rezygnuje i zawsze jestem zaskoczony. Nigdy nie powinienem być."
Struktura: 0–6 s hook · 6–24 s sygnały są wcześniej: dwa odwołania z rzędu, brak ćwiczenia, ten sam utwór trzeci miesiąc · 24–30 s rezygnacja jest widoczna miesiąc wcześniej.
Animacja: oś czasu, trzy sygnały zapalają się w odstępach, na końcu wszystkie trzy naraz i dopiero wtedy znika awatar.
Na ekran: trzy sygnały jako lista.

---

## Filar C — Dowody, nie deklaracje

**Rola**: wiarygodność. W trybie bez wizerunku ten filar **przestaje opowiadać
o Tobie i zaczyna pokazywać rzeczy publiczne**. Każdy numer musi dać się
sprawdzić przez widza w trzydzieści sekund — inaczej jest tylko twierdzeniem,
a twierdzeniu bez twarzy nikt nie wierzy.

Ta przebudowa wychodzi filarowi na dobre. Nagranie listy stu osiemdziesięciu
wydań z datami jest twardszym dowodem niż człowiek mówiący do kamery, że dużo
pracuje.

**Produkcja**: szablony T3 i T4. Materiał źródłowy to changelog, publiczne repo
i sam produkt. Tekst w pierwszej osobie, podpisany imieniem, na ekranie.

**C-01 · Wyłączyłem funkcję, którą budowałem trzy tygodnie** `35 s` `T3`
Hook: „Zbudowałem funkcję przez trzy tygodnie i wyłączyłem ją jedną linią."
Struktura: 0–6 s hook · 6–22 s co to było i dlaczego nie zarobiła na miejsce · 22–35 s wróciła, bo rodzice patrzą właśnie na to.
Animacja: pasek trzech tygodni pracy kurczy się do jednej linii kodu z prawdziwym commitem i datą; potem wartość wraca.
Dowód: prawdziwy commit z widoczną datą i skrótem.
Na ekran: „3 tygodnie" → „1 linia", pod spodem podpis imieniem.

**C-02 · Sto osiemdziesiąt wydań, wszystkie publiczne** `30 s` `T4`
Hook: „Sto osiemdziesiąt wydań w rok. Wszystkie z datą, wszystkie do sprawdzenia."
Struktura: 0–5 s hook · 5–22 s przewijana prawdziwa lista wydań, widoczne daty i odstępy · 22–30 s adres, pod którym to leży.
Animacja: nagranie ekranu strony wydań, przewijanie ze stałą prędkością, licznik dobija w rogu.
Dowód: **to jest najmocniejszy numer w całym filarze** — nie mówisz, że pracujesz, tylko pokazujesz rejestr, który każdy może otworzyć.
Na ekran: liczba wydań, data ostatniego, adres.

**C-03 · Dlaczego nie zbudowałem kalendarza** `35 s` `T3`
Hook: „Każdy konkurent ma własny kalendarz. Ja świadomie go nie zbudowałem."
Struktura: 0–6 s hook · 6–24 s nauczyciel już żyje w Google Calendar; lekcje synchronizują się w obie strony · 24–35 s najlepszy interfejs to ten, którego nie musisz otwierać.
Animacja: dwa kalendarze, drugi znika, strzałki krążą w obie strony między pozostałym a aplikacją.
Dowód: przejście na nagranie działającej synchronizacji na końcu, dwie sekundy.
Na ekran: „nie budować" jako decyzja.

**C-04 · Tysiąc sześćset commitów, repozytorium jest otwarte** `30 s` `T4`
Hook: „Nie musisz mi wierzyć na słowo. Kod jest publiczny."
Struktura: 0–5 s hook · 5–22 s przewijana historia commitów, wykres aktywności, liczba testów · 22–30 s adres repozytorium.
Animacja: nagranie ekranu repozytorium, bez upiększeń — surowość jest tu argumentem.
Dowód: cały klip jest dowodem. To jest zamiennik numeru „napisałem to dla siebie", który w trybie bezosobowym był samą deklaracją.
Na ekran: liczba commitów, liczba testów, adres.

**C-05 · Czego w Strummy nie ma i nie będzie w tym roku** `35 s` `T3`
Hook: „Powiem, czego moje narzędzie nie robi. To dziwny film promocyjny."
Struktura: 0–6 s hook · 6–26 s nie ma faktur, płatności, panelu dyrektora · 26–35 s mówię to teraz, żebyś nie dowiedział się w trzecim tygodniu.
Animacja: trzy karty funkcji wjeżdżają, każda dostaje przekreślenie. Żadnego ratunkowego „ale za to…".
Na ekran: trzy braki wprost, podpis imieniem.
Uwaga: najbardziej kontrariański numer w banku i **w trybie bezosobowym jeszcze ważniejszy** — szczerość co do braków jest jedyną rzeczą, której farma treści nigdy nie zrobi.

**C-06 · O której powstaje ten kod** `35 s` `T4`
Hook: „Znaczniki czasu w commitach mówią, kiedy naprawdę pracuję."
Struktura: 0–7 s hook · 7–26 s prawdziwy rozkład godzin commitów: pusto po południu, gęsto po dwudziestej pierwszej · 26–35 s po południu uczę. To narzędzie powstaje po lekcjach.
Animacja: histogram godzin zbudowany z prawdziwych danych z gita, słupki wypełniają się kolejno.
Dowód: zastępuje wcześniejszą wersję tego numeru, która była opowieścią o dniu bez żadnego potwierdzenia. Teraz dowodem jest rozkład, którego nie da się podrobić.
Na ekran: godziny jako oś.

**C-07 · Bezpieczeństwo pilnuje baza, nie aplikacja** `30 s` `T4`
Hook: „Twoje dane o uczniach chroni baza danych, nie kod strony."
Struktura: 0–6 s hook · 6–22 s uczeń nie zobaczy cudzych danych nawet przy błędzie interfejsu, bo reguła siedzi poziom niżej · 22–30 s to jedyny sposób, w jaki oddałbym komuś dane swoich uczniów.
Animacja: trzy warstwy, górna dostaje błąd, zapora zapala się na najniższej, zapytanie się odbija; wstawka z prawdziwą polityką dostępu.
Dowód: polityka jest w publicznym repozytorium, więc da się ją otworzyć.
Na ekran: „reguła w bazie, nie w przeglądarce".
Uwaga: raczej LinkedIn niż TikTok.

**C-08 · Pierwszy nauczyciel spoza mojego studia** `25 s` `T3`
Hook: „Dziś zalogował się pierwszy nauczyciel, którego nie znam osobiście."
Struktura: 0–5 s hook · 5–18 s co to zmienia · 18–25 s przez rok to była aplikacja dla jednej osoby.
Animacja: licznik kont przeskakuje z jednego na dwa. Cały klip to jedna cyfra.
Na ekran: data, podpis imieniem.
Uwaga: produkować dopiero, gdy to się stanie.

## Filar D — Produkt w użyciu

**Rola**: konwersja. **Ten filar rezygnacja z kamery omija w całości** — to
zawsze było nagranie ekranu, więc jest teraz Twoim najbardziej autentycznym
materiałem. Warto przesunąć go w miksie o jedną pozycję wcześniej, do fazy
pierwszej, właśnie dlatego, że jest jedynym filarem pokazującym rzecz prawdziwą.

**Produkcja**: szablon T4. Nagranie ekranu z demo studia, nigdy prawdziwe dane
uczniów. Kursor spowolniony — szybki kursor jest nieczytelny w pionie.

**D-01 · Utwór w repertuarze ucznia w osiem sekund** `20 s` `T4`
Hook: „Uczeń mówi, że chce zagrać Blackbirda. Osiem sekund."
Struktura: 0–3 s hook · 3–14 s wyszukanie, dodanie do repertuaru, oznaczenie jako rozpoczęty; tab i link już są · 14–20 s zapisane, zanim skończy się lekcja.
Animacja: nagranie w prawdziwym czasie, bez cięć, licznik sekund w rogu jako dowód.
Na ekran: licznik.

**D-02 · Co dziś gramy, zanim uczeń wejdzie** `25 s` `T4`
Hook: „Czwartek, 15:58. Uczeń wchodzi za dwie minuty."
Struktura: 0–5 s hook · 5–20 s dzisiejsze lekcje, przy każdej ostatnia notatka i to, co się zacięło · 20–25 s lekcja zaczyna się od grania.
Animacja: jedno przewinięcie ekranu, podświetlenia wchodzą na kolejne sekcje z opóźnieniem.
Na ekran: godzina jako znacznik.

**D-03 · Notatka po lekcji z trzech zdań obserwacji** `30 s` `T4`
Hook: „Piszę trzy zdania po lekcji. Dostaję notatkę, którą mogę pokazać rodzicowi."
Struktura: 0–5 s hook · 5–22 s wpisanie trzech surowych obserwacji i uporządkowana notatka · 22–30 s to nie pisze za mnie lekcji, porządkuje to, co zauważyłem.
Animacja: widoczne wejście i wyjście obok siebie, bez przyspieszania w miejscu, w którym dzieje się przetwarzanie.
Na ekran: „3 zdania" → „notatka".
Uwaga: nie nazywaj tego AI ani w napisach, ani w opisie. Pokaż efekt.

**D-04 · Semestr jednego ucznia w piętnaście sekund** `25 s` `T4`
Hook: „Tak wygląda pół roku nauki jednej osoby."
Struktura: 0–4 s hook · 4–20 s przewinięcie historii od września do stycznia · 20–25 s tego nie da się odtworzyć z pamięci.
Animacja: płynne przewijanie ze stałą prędkością, daty przesuwają się w rogu jako licznik.
Na ekran: daty.

**D-05 · Cztery etapy utworu i jak się przesuwają** `30 s` `T4`
Hook: „Utwór ma cztery stany. Nigdy nie cofa się sam."
Struktura: 0–5 s hook · 5–22 s przejścia na przykładzie trzech utworów jednego ucznia · 22–30 s uczeń widzi to samo co ja.
Animacja: ścieżka czterech etapów pod nagraniem, znacznik przeskakuje przy każdej zmianie w interfejsie.
Na ekran: cztery etapy jako ścieżka.

**D-06 · Siedemdziesiąt osiem uderzeń na minutę, po miesiącu sto dwanaście** `30 s` `T4`
Hook: „Uczeń nie czuje, że robi postępy. Tempo mówi co innego."
Struktura: 0–6 s hook · 6–22 s wpis sprzed miesiąca i dzisiejszy na tym samym utworze · 22–30 s to jedyny argument, który działa na ucznia chcącego zrezygnować.
Animacja: wykres rysuje się od lewej, dwie wartości zostają podpisane i zostają na ekranie do końca.
Na ekran: „78 BPM" → „112 BPM".

**D-07 · Lekcja z Google Calendar ląduje sama** `20 s` `T4`
Hook: „Umawiam lekcję tam, gdzie umawiam wszystko. Nie przepisuję jej drugi raz."
Struktura: 0–4 s hook · 4–15 s wydarzenie w kalendarzu, przełączenie, lekcja już jest · 15–20 s w obie strony.
Animacja: dwa okna jedno nad drugim w pionie, wpis pojawia się w drugim z opóźnieniem.
Na ekran: „bez przepisywania".

**D-08 · Co widzi rodzic, a czego nie** `30 s` `T4`
Hook: „Rodzic widzi postępy dziecka. Nie widzi moich notatek."
Struktura: 0–6 s hook · 6–24 s widok rodzica obok widoku nauczyciela, wskazane różnice · 24–30 s przejrzystość nie znaczy, że wszystko jest jawne.
Animacja: podział ekranu w poziomie, elementy widoczne tylko dla nauczyciela wygaszają się po stronie rodzica.
Na ekran: „widzi" / „nie widzi".

---

## Filar E — Dowód

**Rola**: potwierdzenie od trzeciej strony. **Nie produkuj tego wcześniej niż
w szóstym tygodniu i nigdy na zapas.** Sfabrykowany albo naciągnięty dowód
w niszy tej wielkości wraca do ciebie w dwa tygodnie.

**Produkcja**: szablony T4 i T5, materiałem są prawdziwe zrzuty ekranu.

**E-01 · Pierwsza wiadomość od obcego nauczyciela** `25 s` `T5`
Hook: sama wiadomość, bez wstępu.
Struktura: 0–12 s treść wiadomości odsłania się linijka po linijce · 12–25 s co w niej było zaskakujące.
Animacja: zrzut z zamazanym nazwiskiem, tekst pojawia się w tempie czytania, nie szybciej.
Uwaga: zgoda autora przed publikacją, zawsze.

**E-02 · Czego zażądali pierwsi użytkownicy** `30 s` `T3`
Hook: „Pięciu nauczycieli poprosiło o to samo. Nie było tego w moich planach."
Struktura: 0–6 s hook · 6–24 s co to było i dlaczego się myliłeś · 24–30 s dlatego pytam, zanim buduję.
Animacja: pięć osobnych próśb zbiega się w jeden punkt.

**E-03 · Liczba, która nie jest marketingowa** `20 s` `T3`
Hook: prawdziwa, mała liczba bez upiększania.
Struktura: 0–5 s liczba · 5–20 s co znaczy i czego jeszcze nie znaczy.
Animacja: jedna cyfra na całym kadrze, bez odliczania w górę — odliczanie sugeruje wzrost, którego jeszcze nie ma.
Uwaga: małe prawdziwe liczby budują więcej zaufania niż duże okrągłe. Nie zaokrąglaj w górę.

**E-04 · Rok później, ten sam czwartek** `30 s` `T5`
Hook: „Rok temu prowadziłem to w zeszycie."
Struktura: 0–6 s hook · 6–24 s zeszyt sprzed roku obok dzisiejszego ekranu, ten sam uczeń · 24–30 s domknięcie.
Uwaga: klip rocznicowy, do wykorzystania raz.

---

## Czego nie produkować

- **Plansz tytułowych na początku klipu.** Największa pokusa animacji i najdroższy
  sposób na stratę widowni. Pierwsza klatka to treść.
- **Ruchu bez znaczenia.** Każde przejście ma pokazywać zależność. Efekt dla
  efektu czyta się jak reklama.
- **Klipów dłuższych niż czterdzieści sekund w filarach A i B.**
- **Porównań z konkurencją.** Przy zerze użytkowników reklamują ich.
- **Zapowiedzi funkcji, których nie ma.** Filar C żyje z tego, co już działa.
- **Prawdziwych danych uczniów w kadrze.** Zawsze demo studio.
- **Trendujących dźwięków pod klipy edukacyjne.** Podkład zagłusza gitarę, czyli
  to, czego widz ma słuchać.
- **Stocku i generycznych ilustracji.** Szablony biorą tokeny z produktu; klip ma
  wyglądać jak Strummy, nie jak prezentacja.
- **Syntetycznego lektora.** W niszy, gdzie nauczyciel mówi do nauczyciela, głos
  TTS czyta się jako treść masowa i kosztuje więcej zaufania, niż daje zasięgu.
- **Podszywania się pod obecność człowieka.** Żadnych stockowych rąk na gryfie
  ani wygenerowanych zdjęć „założyciela". Anonimowość jest uczciwa, udawanie nie.

---

## Utrzymanie banku

1. **Po każdej lekcji, na której coś cię zirytowało, dopisz linijkę do filaru B.**
   To jedyne prawdziwe źródło tego filaru i regeneruje się samo.
2. **Każde wydanie zmieniające coś widocznego to kandydat na C lub D.**
   Changelog jest twoim kalendarzem redakcyjnym.
3. **Klip, który zadziałał, wyprodukuj ponownie w trzech wariantach.** Przy
   szablonach to kosztuje kilkanaście minut, a formaty się powtarzają, podczas
   gdy publiczność nie.
4. **Poprawiaj szablon, nie klipy.** Zmiana typografii w T1 poprawia szesnaście
   klipów naraz. To jest przewaga, której filmowanie nie miało — używaj jej.
