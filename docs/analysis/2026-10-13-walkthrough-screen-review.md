# Przewodnik po ekranach — recenzja widok po widoku

**Date**: 2026-10-13
**Author**: Claude (sesja z Piotrem)
**Scope**: każdy ekran z `docs/product-walkthrough/2026-10-13-strummy-przewodnik-po-ekranach.pdf` (38 stron, 47 zrzutów) zestawiony z makietami Claude Design (`design-mockups/implementation-2026-10-10/`, `claude design - mockups/batch-02-incoming/`).
**Pytanie**: dlaczego makiety wyglądają lepiej niż aplikacja na zrzutach i co konkretnie trzeba poprawić.

---

## 1. Werdykt

Makiety nie wyglądają lepiej dlatego, że mają inny system — system jest ten sam (kość słoniowa, atrament, złoto, Fraunces + Geist) i na większości ekranów aplikacja go trzyma. Wyglądają lepiej z **sześciu powodów przekrojowych**, które powtarzają się na kilkudziesięciu zrzutach. Naprawa tych sześciu podniesie cały dokument bardziej niż przerabianie pojedynczych ekranów.

| #   | Problem przekrojowy                                                                                                           | Ile ekranów dotyka | Waga |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---- |
| P1  | **Natywne kontrolki** (`<select>`, `dd/mm/yyyy`, `--:--`, textarea) tam, gdzie makieta ma pigułki, dzielone pola i chipy      | 9                  | ★★★  |
| P2  | **Mieszanka PL/EN** na jednym ekranie (nagłówki Domu, logowanie, 404, poziomy, daty, „On track”, „View history”)              | 14                 | ★★★  |
| P3  | **Puste ekrany** — 50–70 % wysokości telefonu bez treści (szczegół lekcji, szablony, umiejętności, teoria, skrzynka, reset)   | 9                  | ★★★  |
| P4  | **Ekrany z innej generacji UI** — bold sans, zielone/czerwone/brązowe przyciski, szare paski (Ćwiczenia, Prośby, Teoria, 404) | 5                  | ★★   |
| P5  | **Przycisk pomocy „?”** w prawym dolnym rogu zasłania treść na każdym zrzucie (m.in. „Dalej” w kreatorze utworu, statusy)     | 40+                | ★★   |
| P6  | **Cztery wzorce nagłówka strony** na telefonie zamiast jednego                                                                | 12                 | ★★   |

Do tego dochodzą trzy sprawy **samego dokumentu** (nie aplikacji): dane testowe w mailach („Dear Emma Wright Test Test Test…”, „E2E Flow Assignment 1791799448451”), surowy szablon GoTrue pokazany jako ekran produktu, i rozdział 2 zaczynający się od strony z samym tytułem.

Ocena ogólna zrzutów: **3,3 / 5**. Najlepsze ekrany (4,5): Dom ucznia, Gryf, Lekcje i Profil ucznia na komputerze. Najsłabsze (≤ 2): Lekcja · szczegół (obie role), Ćwiczenia, Prośby o utwory, Teoria, Kalendarz, 404.

---

## 2. Problemy przekrojowe — co dokładnie i jak naprawić

### P1 · Natywne kontrolki zamiast zaprojektowanych

To jest pierwszy powód, dla którego formularz w makiecie „wygląda jak produkt”, a w aplikacji „jak formularz”. Makieta (f05, f01, f09): osobne pola **Data** i **Godzina** z własnym formatem i złotym tintem po wypełnieniu, czas trwania jako segment, utwory jako siatka kart z zaznaczeniem, tonacja jako chip. Aplikacja: `dd/mm/yyyy`, `--:--`, `<select>` z systemową strzałką.

Gdzie: Zaplanuj lekcję, Edytuj lekcję, Dodaj ucznia (instrument, data), Nowe zadanie (utwór), Ćwiczenia (utwór), Utwory (tonacja), Osoby (3 selecty filtrów), Szybkie przypisanie na stronie utworu (desktop).

Jak: jeden zestaw kontrolek w systemie edytorskim — `DateField` (dzień · miesiąc · rok jako trzy segmenty albo popover z kalendarzem w tokenach), `TimeField` (segment godzin, krok 15 min), `Segmented` (czas trwania, poziom, format), `ChipSelect` (tonacja, utwór z wyszukiwarką). Wypełnione pole dostaje `bg-gold-50`, tak jak w makiecie. Native fallback tylko pod `prefers-reduced-motion`/brak JS.

### P2 · Dwa języki na jednym ekranie

Dokument jest polski, demo jest polskie, a najważniejszy ekran (Dom nauczyciela) ma 11 angielskich etykiet. Lista:

| Ekran                          | Angielskie elementy                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dom · nauczyciel (tel + PC)    | NEXT · IN 46M, Open lesson prep, TODAY · 1 LESSON · 45M, WEEK 42 · DENSITY, M T W T F S S, 8 LESSONS · 6H TEACHING · 15 % UTILIZATION, THIS WEEK VS LAST, Teaching hours, Practice logged, Songs assigned, Good morning, Assignments, New lesson, Today/Week/Month |
| Logowanie, błędne hasło, reset | cały ekran                                                                                                                                                                                                                                                         |
| Kalendarz                      | October 2026                                                                                                                                                                                                                                                       |
| Zadanie · szczegół             | View history, Friday, October 16, 2026                                                                                                                                                                                                                             |
| Osoby, Profil ucznia           | Aug 27, 2026, On track                                                                                                                                                                                                                                             |
| Dodaj ucznia                   | Guitar, Beginner / Novice / Intermediate / Advanced                                                                                                                                                                                                                |
| Umiejętności                   | Good morning, Anna                                                                                                                                                                                                                                                 |
| Repertuar                      | Oct 13, 2026                                                                                                                                                                                                                                                       |
| 404                            | cały ekran                                                                                                                                                                                                                                                         |
| Maile (4)                      | całe                                                                                                                                                                                                                                                               |

Jak: (a) jeden helper formatowania dat/godzin z `locale` profilu — dziś są co najmniej trzy formaty (`16 · paź · pt`, `Friday, October 16, 2026`, `Aug 27, 2026`, `10/12/2026`); (b) klucze i18n dla Domu, auth, 404, poziomów i statusów zdrowia; (c) powitanie zależne od pory dnia **i** języka („Dzień dobry” / „Dobry wieczór”).

### P3 · Puste ekrany

Makieta nigdy nie pokazuje pustki — a dokument sprzedażowy tym bardziej nie powinien. Dwa źródła:

1. **Seed**: lekcje z bieżącego tygodnia mają 0 utworów, brak powiadomień w skrzynce, brak umiejętności, brak szablonów, jedna lekcja na osi dnia desktopowego Domu. To naprawia się w `seed:demo`, nie w UI.
2. **Brak sekcji w UI**: szczegół lekcji na telefonie nie ma tego, co ma makieta f19 — CTA „Rozpocznij lekcję”, wiersza ucznia z poziomem i stażem, sekcji Utwory z paskami etapów, sekcji Zadania. Przy 0 utworach sekcja znika zamiast pokazać „+ Dodaj utwór”. To jest ekran, na którym opiera się zasada 2 („Lekcja jest zapisem”) — i wygląda najbiedniej z całego dokumentu.

Jak: sekcje zawsze widoczne z pustym stanem i akcją; seed demo z utworami w każdej lekcji, 6–8 powiadomieniami, 2 szablonami, 3 umiejętnościami, 3 lekcjami na dzisiejszej osi.

### P4 · Ekrany z innej generacji interfejsu

Zasada 6 w rozdziale 13 mówi „jedna generacja interfejsu”. Pięć ekranów w dokumencie jej zaprzecza i widać to gołym okiem obok reszty:

- **Ćwiczenia** (s-practice): bold sans „Ćwiczenia”, „Zarejestruj sesję”, „Historia”; brązowo‑oliwkowy przycisk; natywny select; karta formularza bez eyebrow.
- **Prośby o utwory**: zielony „Zatwierdź”, czerwony outline „Odrzuć”, niebieski link, sans tytuł utworu, nagłówek serif italic łamiący się na dwie linie.
- **Teoria**: szary pasek nagłówka z sans „Teoria / 1 kurs”, zielona plakietka poziomu, kwadratowy złoty FAB.
- **404**: bold sans „404”, szary tekst, brązowy przycisk.
- **Maile**: czarny nagłówek z serif w złocie — inny język wizualny niż aplikacja (kość słoniowa). Spójne między sobą, ale nie z resztą.

Jak: przepisać te cztery widoki na prymitywy edytorskie (`ed-*`), przyciski w jednej palecie (czarny primary, outline secondary, czerwony tylko tekstowo przy akcji destrukcyjnej). Maile: nagłówek w kości słoniowej z logo, ten sam serif, złote eyebrow.

### P5 · Przycisk „?” zasłania treść

Na 40+ zrzutach złote kółko w prawym dolnym rogu przykrywa: przycisk „Dalej” (Nowy utwór), status „ZAKOŃCZONA” (Lekcje), „Songs assigned 14” (Dom), ostatnie wiersze list. W makietach go nie ma.

Jak: (a) ukrywać w trybie zrzutów (`?walkthrough=1` albo klasa na `html` ustawiana przez spec Playwright); (b) na telefonie przenieść do menu hamburgera lub do nagłówka obok dzwonka — FAB w prawym dolnym rogu koliduje z każdym sticky CTA.

### P6 · Jeden nagłówek strony

Na telefonie są dziś cztery wzorce:

| Wzorzec                                                  | Gdzie                   |
| -------------------------------------------------------- | ----------------------- |
| serif regular + licznik + „+” w kółku                    | Lekcje, Moje lekcje     |
| eyebrow mono + serif italic + czarny przycisk            | Utwory, Osoby           |
| eyebrow mono + serif regular + licznik + czarny przycisk | Zadania, Zadania ucznia |
| bold sans + licznik                                      | Ćwiczenia, Teoria       |
| eyebrow + powitanie                                      | Umiejętności            |

Jak: jeden `PageHeader` (eyebrow · tytuł serif · podtytuł z licznikiem · akcja primary po prawej), a kursywa tylko dla słowa‑akcentu jak w makietach („Zaplanuj _lekcję_.”).

---

## 3. Widok po widoku

Skala: 5 = na poziomie makiety lub lepiej · 4 = drobne różnice · 3 = widać, że to „ten sam system, gorsza realizacja” · 2 = wymaga przeróbki · 1 = nie powinno być w dokumencie.
Kolumna „Makieta” wskazuje plik w `design-mockups/implementation-2026-10-10/` (lewa połowa obrazka to Claude Design).

### Rozdział 2 · Dom nauczyciela

| Ekran              | Ocena | Makieta | Co jest dobrze                                                           | Co poprawić                                                                                                                                                                                                                            |
| ------------------ | ----- | ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dom · przed lekcją | 3,5   | f34     | Układ 1:1 z makietą: karta „Next”, oś dnia, gęstość tygodnia, porównanie | P2 (11 etykiet EN). Pod nazwą ucznia makieta ma poziom i chipy utworów („G Blackbird · C Landslide”) — tu pusto (seed). „Wymaga uwagi” w makiecie jest zaraz pod osią dnia, tu pod kadrem. Dni tygodnia M T W T F S S → P W Ś C P S N. |
| Dom · menu         | 4     | —       | Dziewięć pozycji, trzy grupy, konto na dole — czytelne                   | Logo „Strummy NAUCZYCIEL” nachodzi na ikonę zamknięcia. Brak pozycji „Ustawienia” (jest tylko wylogowanie) — Ustawienia powiadomień z rozdz. 10 nie mają wejścia z menu.                                                               |

### Rozdział 3 · Wejście

| Ekran             | Ocena | Makieta | Co jest dobrze                                            | Co poprawić                                                                                                                                                                                                |
| ----------------- | ----- | ------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strona główna     | 4     | f18     | Nagłówek, dwa wyjścia, po polsku                          | Plakietka „PUBLICZNA BETA” łamie się na dwie linie i wisi obok tekstu; pasek avatarów w stopce ucięty; przełącznik ról + plakietka + nagłówek to trzy różne szerokości jedna pod drugą.                    |
| Dla nauczycieli   | 3     | —       | Dobry copy                                                | Strona bez ani jednego obrazka ani zrzutu; „← Strummy” jako jedyna nawigacja, 11 px; karta demo i formularz nie mają hierarchii (oba to szare ramki).                                                      |
| Logowanie         | 3     | f15     | Karta, serif „Sign _in_.”, czarny CTA — 1:1 z makietą     | P2 — cały ekran EN, a to pierwszy ekran zaproszonego ucznia. Makieta zakłada magic link + Google/Apple; produkt ma hasło — OK, ale wtedy „Forgot password?” powinien być pod przyciskiem, nie w etykiecie. |
| Logowanie · błąd  | 4     | —       | Komunikat prowadzi do rozwiązania                         | P2.                                                                                                                                                                                                        |
| Reset hasła       | 3     | —       | Jedno pole                                                | P2, P3 — karta w 1/3 wysokości, reszta pusta; „BACK TO HOME” w lewym górnym rogu i „← Back to sign in” na dole to dwa style tej samej akcji.                                                               |
| Gryf · publicznie | 4     | f17     | Po polsku, PL copy w żółtej wskazówce, gryf 1:1 z makietą | Nagłówek publiczny („Strummy · Zaloguj się · Wypróbuj demo”) to trzeci styl paska górnego w dokumencie (obok hamburgera i landing‑u). Pięć przycisków dźwięków ucina się na „G”.                           |

### Rozdział 4 · Lekcje

| Ekran                 | Ocena | Makieta | Co jest dobrze                                                    | Co poprawić                                                                                                                                                                                                                                                                             |
| --------------------- | ----- | ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lekcje · lista        | 4     | f20     | Karty, separator daty, numer, kolorowe avatary — jak makieta      | Chipy filtrów ucięte na „Odwołan” bez cienia/gradientu sugerującego przewijanie; „0 utworów” w każdej karcie (seed); P5 zasłania status ostatniej karty.                                                                                                                                |
| Lekcje · zakończone   | 4     | f20     | j.w.                                                              | j.w.                                                                                                                                                                                                                                                                                    |
| **Lekcja · szczegół** | **2** | f19     | Blok daty, status, ołówek                                         | **Najsłabszy ekran dokumentu.** Makieta: CTA „Start live lesson”, uczeń z poziomem i stażem, Utwory z paskami etapów, Notatki, Zadania. Produkt: uczeń, jedna linia notatki w ramce wyglądającej jak input, 60 % pustki. Sekcje Utwory i Zadania muszą być zawsze widoczne z „+ Dodaj”. |
| Zaplanuj lekcję       | 3     | f05     | Pigułki uczniów, akordeon z licznikiem, „Nowy uczeń przez e‑mail” | P1 (data, godzina, czas trwania). Nagłówek sekcji „Uczeń i termin” łamie się i zderza z licznikiem 1/4. Eyebrow „I · KTO I KIEDY” + tytuł + licznik + chevron to za dużo na 390 px — makieta mobilna (f28) używa jednej linii.                                                          |
| Edytuj lekcję         | 3     | f05     | Złoty tint wypełnionych pól ✓, segment Format ✓                   | P1. Tytuł „Edytuj _lekcję_.” z podtytułem „Wybierz ucznia, termin i materiał” — ten podtytuł jest z formularza _nowej_ lekcji.                                                                                                                                                          |
| **Kalendarz**         | **2** | —       | Dzisiejszy dzień zaznaczony                                       | Siatka 7 kolumn na 390 px — widać tylko PON–CZW, reszta ucięta. Na siatce nie ma żadnej lekcji mimo 40 w demo. „October 2026” EN. Karta Google pod spodem wygląda jak reklama. Na telefonie potrzebny widok tygodnia/agendy, nie miesiąca.                                              |

### Rozdział 5 · Utwory

| Ekran                      | Ocena | Makieta | Co jest dobrze                                                 | Co poprawić                                                                                                                                                                                                                                                                            |
| -------------------------- | ----- | ------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utwory · biblioteka        | 3     | —       | Liczniki przy filtrach, zakładki gatunków                      | Sześć rzędów filtrów (poziom ×2, sortowanie, tonacja select, autor, tytuł, gatunki) zanim pojawi się pierwszy utwór — na telefonie pierwszy wynik jest na 60 % wysokości. „Oczekujące prośby” to szary przycisk wyglądający na wyłączony. Okładki to jednolite kwadraty. P1 (tonacja). |
| Utwór · podgląd w panelu   | 4     | f27     | Okładka, kafle metryki, karta Wykorzystanie — ładne            | Tytuł „Wonderwall” i „Oasis” za blisko siebie; przycisk „Otwórz pełną stronę” konkuruje z „×”.                                                                                                                                                                                         |
| Utwór · strona             | 4     | f27     | Akcje, metryka mono, odtwarzacz, zakładki, karta akordów — 1:1 | Pasek akcji ma pięć przycisków w dwóch rzędach (gwiazdka, kosz, Duplikuj, Edytuj, Zadaj) — makieta mobilna ma jeden primary + „…”. Okładka 60 px wygląda jak miniatura, nie jak hero.                                                                                                  |
| Nowy utwór · krok I        | 3     | f28     | Układ 1:1 z makietą (Spotify, pola podkreślone, pasek kroków)  | „Pieśń I” (Canto I → to nie jest polskie). Zakładki poziomu ucięte („Średniozaaw…”, „Zaawansowa…”). **P5 zasłania przycisk „Dalej”.** Pole „Tytuł” z placeholderem „Hotel California” w serif italic wygląda jak wypełnione.                                                           |
| Utwory · filtr bez wyników | 3     | —       | Komunikat w karcie                                             | Ten sam problem sześciu rzędów filtrów; pusty stan nie ma przycisku „Wyczyść filtry”.                                                                                                                                                                                                  |
| **Prośby o utwory**        | **2** | —       | Prosta decyzja                                                 | P4 — zielony/czerwony przyciski, niebieski link, sans tytuł. Nagłówek italic serif łamie się na dwie linie z strzałką wstecz w innym wierszu. Jedna prośba = jedna karta, dobrze; styl = inna aplikacja.                                                                               |

### Rozdział 6 · Zadania

| Ekran              | Ocena | Makieta | Co jest dobrze                                         | Co poprawić                                                                                                                                                                                                                                        |
| ------------------ | ----- | ------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zadania · lista    | 3,5   | f02     | Gęsta lista, kolorowe avatary, status po prawej        | Zakładki „Otwarte · 8” łamią się na dwie linie. Tytuł ucięty po 10 znakach („Blackbird — w…”, „Pentato…”) — na telefonie tytuł powinien dostać drugą linię, a opis zniknąć. Statusy w mono 9 px.                                                   |
| Nowe zadanie       | 3     | f01     | Pigułki, sekcje z licznikiem, CTA u góry — jak makieta | P1 (utwór jako select „Brak utworu”). „Wygeneruj zadanie” wygląda na wyłączony (szary, 10 px). Sekcja „Utwór lub ćwiczenie” — tytuł łamie się przy liczniku.                                                                                       |
| Zadanie · szczegół | 2,5   | —       | Opis i Postęp jako dwie karty                          | Rząd „W TRAKCIE · VIEW HISTORY · ZAPISZ JAKO SZABLON · EDYTUJ” — cztery akcje w mono uppercase w jednej linii, nieczytelne; P2 (View history, Friday, October 16, 2026). Tytuł 34 px serif na dwie linie + „dla Zofia Nowak” to dobre; reszta nie. |
| Szablony           | 3     | —       | Pusty stan z wyjaśnieniem                              | P3. „+ NOWY SZABLON” jako mono outline — a w rozdziale czytamy, że szablon powstaje z zadania, więc przycisk przeczy copy.                                                                                                                         |

### Rozdział 7 · Uczniowie

| Ekran          | Ocena   | Makieta                               | Co jest dobrze                                      | Co poprawić                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Osoby**      | **2,5** | (f34 dół: „Studio · active students”) | „Wyślij ponownie” przy właściwej osobie             | Trzy natywne selecty jeden pod drugim + wyszukiwarka = panel admina. Avatary **szare** (jedyne miejsce bez kolorów per uczeń). Wiersz: imię, e‑mail, „UCZEŃ” mono, data EN — brak poziomu, ostatniego ćwiczenia, zdrowia. Makieta ma wzorzec „Studio”: avatar kolor, poziom, „4 songs · 74d ago”, kropka zdrowia, filtr Health/Recent/A–Z. |
| Uczeń · profil | 4       | f31                                   | Cztery kafle, zakładki, wykres, CTA — 1:1 z makietą | P2 („On track”, „Od Aug 27, 2026”). Zakładki ucięte na „Umiejętn”. „Importuj utwory” jako tekst pod przyciskami wygląda na przypadkowe.                                                                                                                                                                                                    |
| Dodaj ucznia   | 3       | f09                                   | Sekcje, podgląd, kolory avatara                     | P1 (instrument select, data), P2 (Guitar, Beginner / Novice / Intermed… / Advanced — ucięte). Tytuł sekcji II „Kontakt do ucznia i rodzica” łamie się na trzy linie.                                                                                                                                                                       |

### Rozdział 8 · Ekrany ucznia

| Ekran               | Ocena   | Makieta         | Co jest dobrze                                                                         | Co poprawić                                                                                                                                                                                                                               |
| ------------------- | ------- | --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dom ucznia**      | **4,5** | f30             | Najlepszy ekran mobilny: „za _0h 44m_”, praktyka z checkboxami, pasek, 3 liczby, cytat | Trzy zadania po 10 min mają identyczny układ — makieta różnicuje przez „measures 1–8, slow” w mono. Tu już jest. Nic istotnego.                                                                                                           |
| Moje lekcje         | 4       | f21             | Spójne z listą nauczyciela                                                             | Jak Lekcje · lista (chipy ucięte).                                                                                                                                                                                                        |
| **Moja lekcja**     | **2**   | f19             | —                                                                                      | To samo co Lekcja · szczegół: pusto. Uczeń powinien tu widzieć utwory z etapem, zadanie z lekcji, notatkę. Ekran, który ma odpowiadać na „co robiliśmy ostatnio”, pokazuje jedną linię.                                                   |
| Moje zadania        | 3,5     | f03             | Lista + wysuwany szczegół, pasek postępu pod tytułem                                   | Wysunięty panel nachodzi na listę bez przyciemnienia tła — wygląda jak błąd układu. Makieta ma dla zadania wykres ćwiczeń, akordy, nagranie — tu tylko lista.                                                                             |
| Zadanie · od ucznia | 3       | f03             | Jedna akcja, czarny CTA                                                                | P3 (dolna połowa pusta). Brak karty akordów i dziennika ćwiczeń z makiety. „Self‑report” EN.                                                                                                                                              |
| Repertuar           | 3,5     | f30 (repertuar) | Chipy etapów z licznikami, sortowanie                                                  | Wiersz „Wonderwall · MOJE NOTATKI ⌄ · Oasis · Opanowany · Oct 13, 2026” — cztery style typografii w jednym wierszu. Drugi wiersz ma uchwycony stan hover (ciemniejsze tło). Makieta: tonacja mono po lewej, tytuł, autor, czas po prawej. |
| **Ćwiczenia**       | **2**   | —               | Chipy czasu                                                                            | P4 — cały ekran jest z innej generacji (bold sans, oliwkowy przycisk, natywny select). Formularz „Zarejestruj sesję” nad historią to dobry pomysł, zła realizacja. P1.                                                                    |
| Biblioteka · uczeń  | 3       | —               | Ta sama biblioteka                                                                     | Jak Utwory · biblioteka + mono uppercase „CHCĘ SIĘ NAUCZYĆ” w każdym wierszu konkuruje z tytułem.                                                                                                                                         |

### Rozdział 9 · Umiejętności i narzędzia

| Ekran                     | Ocena | Makieta | Co jest dobrze                                         | Co poprawić                                                                                                                                   |
| ------------------------- | ----- | ------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Umiejętności · start      | 3,5   | f10a    | Kafle XP/Dziś/Skuteczność, Cel dnia, karta trybu — 1:1 | P2 („Good morning, Anna”). Trzeci kafel ucięty („SKUTECZNOŚ”). Sekcja „Ćwiczysz” pusta italic na dole.                                        |
| Quiz akordów              | 4     | f10b    | Diagram, cztery odpowiedzi, pasek, serca, seria        | Diagram ma gradient złoty w tle, odpowiedzi nie — lekko niespójne; poza tym dobre.                                                            |
| Gryf                      | 4,5   | f17     | 1:1 z makietą, po polsku                               | Nic istotnego. (Makieta ma dolny pasek nawigacji — patrz §4.)                                                                                 |
| Moje umiejętności · pusto | 2,5   | —       | Copy wyjaśnia                                          | P3 — jedna karta na pustym ekranie. Brak nawet listy poziomów/„mapy” do pokazania. Do dokumentu sprzedażowego trzeba seedować 3 umiejętności. |
| **Teoria**                | **2** | —       | —                                                      | P4 — szary pasek nagłówka, sans, zielona plakietka, kwadratowy FAB. Słusznie ukryta; w dokumencie powinna być tylko wzmianka, nie zrzut.      |

### Rozdział 10 · Powiadomienia i maile

| Ekran                  | Ocena | Makieta | Co jest dobrze                              | Co poprawić                                                                                                                                                                                        |
| ---------------------- | ----- | ------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ustawienia powiadomień | 3     | f26     | Jeden główny przełącznik                    | Słowo „Powiadomienia” trzy razy na ekranie (zakładka, eyebrow, H1). Zakładki Profil/Powiadomienia/Integracje w przewijanym pasku ucięte na „Int”. P3 — lista typów pod kadrem, karta w 1/4 ekranu. |
| Skrzynka · pusto       | 3     | f22     | Czytelne zdanie                             | Do dokumentu: pusta skrzynka to najgorszy możliwy zrzut tej funkcji. Makieta f22 pokazuje „Daily digest” + 6 wpisów z ikonami. Seed powinien je wygenerować.                                       |
| Mail · lekcja jutro    | 3     | —       | Jedna informacja, jeden przycisk            | P4 (czarny nagłówek vs. aplikacja w kości słoniowej). EN.                                                                                                                                          |
| Mail · podsumowanie    | 2     | —       | Struktura: temat, notatki, utwory z etapami | **„Dear Emma Wright Test Test Test Test…”, „E2E Flow Content Lesson 1791799443653”** — dane testowe w dokumencie sprzedażowym. Albo seed demo wysyła maile do Mailpit, albo ten zrzut wypada.      |
| Mail · nowe zadanie    | 2     | —       | j.w.                                        | j.w.                                                                                                                                                                                               |
| Mail · po terminie     | 3     | —       | Czerwony akcent, ton zachęcający            | j.w.                                                                                                                                                                                               |

### Rozdział 11 · Stany

| Ekran                     | Ocena | Makieta | Co jest dobrze   | Co poprawić                                                                                                                                                                                          |
| ------------------------- | ----- | ------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 404                       | 2     | —       | Jest wyjście     | P4 — bold sans „404”, szary opis, brązowy przycisk; EN. Jedna linia serif „Nie ma takiej strony.” + czarny przycisk wystarczy.                                                                       |
| Mail zaproszenia · surowy | 1     | —       | —                | Surowy szablon GoTrue z `127.0.0.1:3000` nie jest ekranem produktu. Miejsce na to jest w runbooku, nie w przewodniku do demo. Zamiast tego: brandowany mail zaproszenia (szablon z `public/email/`). |
| Tabela pustych stanów     | 4     | —       | Pełna, konkretna | —                                                                                                                                                                                                    |

### Rozdział 12 · Komputer i tablet

| Ekran                     | Ocena | Makieta | Co jest dobrze                                                     | Co poprawić                                                                                                                                                                                          |
| ------------------------- | ----- | ------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dom nauczyciela · PC      | 4     | f33     | Układ 1:1 (oś dnia, gęstość, porównanie, pasek boczny)             | Oś 9–20 z jedną lekcją = 90 % pustej osi (seed: 3 lekcje dziś). P2 (Good morning, Assignments, Today/Week/Month). Makieta ma pod osią „Studio · 6 active students” i „Song library” — tu pod kadrem. |
| Lekcje · lista i szczegół | 4,5   | f06     | Tabela, chipy statusów z licznikami, panel boczny — bardzo dobre   | Panel boczny ma tylko datę, godzinę, ucznia, „Brak utworów” — za mało jak na panel (makieta f04: utwory z etapami, zadania, ciągłość).                                                               |
| Utwór · PC                | 4     | f27     | Hero, odtwarzacz, akordy, Wykorzystanie, Szybkie przypisanie — 1:1 | „Sekcje i przebieg · Nie znaleziono sekcji” pusta karta; P1 w Szybkim przypisaniu (dd/mm/yyyy).                                                                                                      |
| Profil ucznia · PC        | 4,5   | f31     | 1:1 z makietą                                                      | P2 (On track, Aug 27).                                                                                                                                                                               |
| Dom ucznia · PC           | 4     | f29     | Dwie kolumny, oś tygodnia, seria, repertuar, aktywność             | Dolna część (repertuar/aktywność) wygląda na ściśniętą; „Przełóż” obok „Zacznij praktykę” — makieta ma to samo, OK.                                                                                  |
| Tablet pionowo / poziomo  | 4     | —       | Zachowuje się jak opisano                                          | Zrzuty tabletu są za małe w PDF, żeby cokolwiek ocenić — albo większe, albo wypadają.                                                                                                                |

---

## 4. Decyzje do podjęcia (nie są błędami, ale makiety zakładają inaczej)

1. **Dolny pasek nawigacji na telefonie.** Makiety mobilne (f17, f22, f30) mają tab bar: Dom · Lekcje · Gryf/Skrzynka · Ja. Produkt ma hamburger. Rozdział 2 obiecuje „reszta jest jedno dotknięcie dalej” — z hamburgerem to dwa. Tab bar z 4 pozycjami + „Więcej” załatwia też P5 (nie ma gdzie postawić FAB‑a, więc pomoc trafia do „Więcej”).
2. **„Wymaga uwagi” nad czy pod osią dnia.** Makieta f34: pod osią, nad gęstością. Produkt: pod gęstością i porównaniem (poza kadrem). Jeśli flagi są > 0, powinny być widoczne bez przewijania.
3. **Czy Teoria i surowy mail GoTrue mają być w dokumencie.** Rekomendacja: nie — wzmianka tekstowa wystarczy, zrzuty obniżają średnią.

---

## 5. Kolejność prac (od największego efektu na dokument)

| #   | Zadanie                                                                                                                                          | Ekrany, które zyskują | Nakład |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------ |
| 1   | Ukryć „?” w trybie zrzutów; na telefonie przenieść pomoc do nagłówka/menu                                                                        | 40+                   | S      |
| 2   | Seed demo: utwory w każdej lekcji, 3 lekcje dziś, 6 powiadomień, 2 szablony, 3 umiejętności, maile demo (nie E2E) do Mailpit                     | 12                    | S–M    |
| 3   | i18n Domu nauczyciela, auth, 404, poziomów, „On track”; jeden formatter dat/godzin z locale                                                      | 14                    | M      |
| 4   | Lekcja · szczegół (obie role, telefon + panel boczny na PC): CTA, uczeń z poziomem, Utwory z etapami, Zadania, Ciągłość — sekcje zawsze widoczne | 3                     | M      |
| 5   | Kontrolki formularzy: DateField, TimeField, Segmented, ChipSelect zamiast natywnych                                                              | 9                     | M–L    |
| 6   | Przepisać na system edytorski: Ćwiczenia, Prośby o utwory, 404, (Teoria)                                                                         | 4                     | M      |
| 7   | Osoby → wzorzec „Studio” (kolorowe avatary, poziom, ostatnie ćwiczenie, zdrowie; filtry w arkuszu)                                               | 1                     | M      |
| 8   | Utwory: jedna linia wyszukiwania + „Filtry (n)” w arkuszu; okładki z inicjałami; „Oczekujące prośby” jako plakietka z liczbą                     | 3                     | M      |
| 9   | Kalendarz mobile: tydzień/agenda zamiast siatki miesiąca; lekcje na siatce                                                                       | 1                     | M      |
| 10  | Jeden `PageHeader` na telefonie; ucinanie chipów z gradientem; zakładki poziomów bez „…”                                                         | 12                    | S–M    |
| 11  | Maile: nagłówek w kości słoniowej, PL                                                                                                            | 4 (+13 typów)         | M      |
| 12  | Dokument: usunąć surowy mail GoTrue, podmienić zrzuty maili, naprawić pustą stronę rozdz. 2, większe zrzuty tabletu                              | PDF                   | S      |

Po punktach 1–4 (razem ok. 2 dni) dokument przeskakuje z 3,3 na ~4; punkty 5–9 to to, co realnie dzieli aplikację od makiet.

---

## Źródła

- PDF: `docs/product-walkthrough/2026-10-13-strummy-przewodnik-po-ekranach.pdf`
- Zrzuty: `docs/product-walkthrough/shots/*.png` (390 × 844 @2x, tylko viewport)
- Porównania makieta ↔ aplikacja (2026-10-10): `design-mockups/implementation-2026-10-10/f*.jpg`
- Makiety HTML: `claude design - mockups/batch-02-incoming/*.html`, `design-mockups/batch-01-core/*.html`
- Poprzedni audyt: `design-mockups/STATUS.md` (błędy B1–B6 — B6, czyli ekrany poza systemem, nadal widać na zrzutach z 13.10)
