/**
 * The demo studio's content — people, repertoire, lesson history, assignments
 * and this week's schedule.
 *
 * Pure data, no side effects and no environment reads, because two very
 * different transports consume it:
 *   - `seed-demo.ts` writes it over PostgREST with a service-role key,
 *   - `emit-demo-sql.ts` renders it as SQL for a stack that can only be
 *     reached with `docker exec … psql` (no HTTP key available).
 *
 * Keeping it in one module is the point. A second copy of this dataset is
 * exactly the drift `.claude/rules/structure.md` S4 is about.
 */

import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from '@/lib/demo/demo-accounts.constants';

import type {
  AssignmentSpec,
  DemoNotification,
  DemoSongRequest,
  LessonSongSpec,
  WeekLesson,
} from './demo-studio.types';

// ─── Demo Data ────────────────────────────────────────────────────────────────

// Demo-only password — intentionally committed, these accounts are non-production.
// Address and password both live in lib/demo/demo-accounts.constants.ts so the
// sign-in button, the E2E fixtures and this seed cannot drift apart.

// Polish names throughout: the demo is what a teacher from a Polish Facebook
// group lands in, and an all-Anglo studio reads as somebody else's product.
export const DEMO_USERS = [
  {
    email: DEMO_TEACHER_EMAIL,
    fullName: 'Anna Kowalska',
    isTeacher: true,
    isStudent: false,
  },
  { email: DEMO_STUDENT_EMAIL, fullName: 'Zofia Nowak', isTeacher: false, isStudent: true },
  { email: 'kuba@strummy.app', fullName: 'Jakub Wiśniewski', isTeacher: false, isStudent: true },
  { email: 'maja@strummy.app', fullName: 'Maja Lewandowska', isTeacher: false, isStudent: true },
  { email: 'piotrek@strummy.app', fullName: 'Piotr Zieliński', isTeacher: false, isStudent: true },
] as const;

export const STUDENT_EMAILS = {
  zosia: DEMO_STUDENT_EMAIL,
  kuba: 'kuba@strummy.app',
  maja: 'maja@strummy.app',
  piotrek: 'piotrek@strummy.app',
} as const;

export const DEMO_SONGS = [
  {
    title: 'Wonderwall',
    author: 'Oasis',
    level: 'beginner',
    key: 'G',
    tempo: 87,
    capo_fret: 2,
    chords: 'Em7 G Dsus4 A7sus4',
    strumming_pattern: 'D DU UDU',
    category: 'Britpop',
    release_year: 1995,
    youtube_url: 'https://www.youtube.com/watch?v=bx1Bh8ZvH84',
    spotify_link_url: 'https://open.spotify.com/track/3id0eGSBqkGEBiblqgNqoB',
    ultimate_guitar_link: 'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-27596',
    lyrics_with_chords: `[Em7]Today is [G]gonna be the day
That they're [Dsus4]gonna throw it back to [A7sus4]you
[Em7]By now you [G]should've somehow
Rea[Dsus4]lized what you gotta [A7sus4]do
[Em7]I don't believe that [G]anybody
[Dsus4]Feels the way I [A7sus4]do
About you [Em7]now[G] [Dsus4] [A7sus4]

[Em7]Backbeat, the [G]word is on the street
That the [Dsus4]fire in your heart is [A7sus4]out
[Em7]I'm sure you've [G]heard it all before
But you [Dsus4]never really had a [A7sus4]doubt

[C]And all the [D]roads we have to [Em7]walk are winding
[C]And all the [D]lights that lead us [Em7]there are blinding
[C]There are many [D]things that I would
[G]Like to [D]say to [Em7]you
But I don't know [A7sus4]how

Because [Em7]maybe[G] [Dsus4]
You're [A7sus4]gonna be the one that [Em7]saves me[G] [Dsus4]
And [A7sus4]after [Em7]all[G] [Dsus4]
You're my [A7sus4]wonder[Em7]wall[G] [Dsus4] [A7sus4]`,
  },
  {
    title: 'Wish You Were Here',
    author: 'Pink Floyd',
    level: 'intermediate',
    key: 'G',
    tempo: 60,
    capo_fret: 0,
    chords: 'Em7 G A7sus4 C D',
    strumming_pattern: 'Fingerpicking',
    category: 'Classic Rock',
    release_year: 1975,
    youtube_url: 'https://www.youtube.com/watch?v=IXdNnw99-Ic',
    spotify_link_url: 'https://open.spotify.com/track/6mFkJmJqdDVQ1REhVfGgd1',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/pink-floyd/wish-you-were-here-chords-44555',
    lyrics_with_chords: `[Em7]So, so you think you can [G]tell
[Em7]Heaven from [G]hell
[Am]Blue skies from [Am]pain
[D]Can you tell a green [C]field
From a cold steel [D]rail?
A [Am]smile from a [G]veil?
Do you [D]think you can [G]tell?

[Em7]Did they get you to [G]trade
[Em7]Your heroes for [G]ghosts?
[Am]Hot ashes for [Am]trees?
[D]Hot air for a cool [C]breeze?
Cold comfort for [D]change?
Did you [Am]exchange
A [G]walk-on part in the war
For a [D]lead role in a [G]cage?`,
  },
  {
    title: 'Hotel California',
    author: 'Eagles',
    level: 'advanced',
    key: 'Bm',
    tempo: 74,
    capo_fret: 2,
    chords: 'Bm F# A E G D Em',
    strumming_pattern: 'Fingerpicking / arpeggio',
    category: 'Classic Rock',
    release_year: 1976,
    youtube_url: 'https://www.youtube.com/watch?v=EqPtz5qN7HM',
    spotify_link_url: 'https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190',
    lyrics_with_chords: `[Bm]On a dark desert highway, [F#]cool wind in my hair
[A]Warm smell of colitas, [E]rising up through the air
[G]Up ahead in the distance, [D]I saw a shimmering light
[Em]My head grew heavy and my sight grew dim
[F#]I had to stop for the night

[G]There she stood in the [D]doorway
[F#]I heard the mission [Bm]bell
And I was [G]thinking to myself
This could be [D]heaven or this could be [Em]hell
[F#]Then she lit up a candle and she showed me the way`,
  },
  {
    title: 'Blackbird',
    author: 'The Beatles',
    level: 'intermediate',
    key: 'G',
    tempo: 96,
    capo_fret: 0,
    chords: 'G Am7 G/B G C A7 D7 Em',
    strumming_pattern: 'Fingerpicking',
    category: 'Classic Rock',
    release_year: 1968,
    youtube_url: 'https://www.youtube.com/watch?v=Man4Xw8Xypo',
    spotify_link_url: 'https://open.spotify.com/track/5jgFfDIR6FR0gvlA56Nakr',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/the-beatles/blackbird-chords-142882',
    lyrics_with_chords: `[G]Black[Am7]bird [G/B]singing in the [G]dead of [C]night
[A7]Take these [D7]broken [Em]wings and learn to [Cm]fly
[G]All your [A7]life
[D7]You were only waiting for this moment to a[G]rise

[G]Black[Am7]bird [G/B]singing in the [G]dead of [C]night
[A7]Take these [D7]sunken [Em]eyes and learn to [Cm]see
[G]All your [A7]life
[D7]You were only waiting for this moment to be [G]free`,
  },
  {
    title: 'Brown Eyed Girl',
    author: 'Van Morrison',
    level: 'beginner',
    key: 'G',
    tempo: 150,
    capo_fret: 0,
    chords: 'G C D Em',
    strumming_pattern: 'D DU UDU',
    category: 'Rock',
    release_year: 1967,
    youtube_url: 'https://www.youtube.com/watch?v=UfmkgQRmmeE',
    spotify_link_url: 'https://open.spotify.com/track/3yrSvpt2l1xhsV9Em2VIcr',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/van-morrison/brown-eyed-girl-chords-766962',
    lyrics_with_chords: `[G]Hey, where did [C]we go, [G]days when the [D]rains came?
[G]Down in the [C]hollow, [G]playin' a [D]new game
[G]Laughing and a-[C]running, hey hey,
[G]Skipping and a-[D]jumping
[G]In the misty [C]morning fog, [G]with our [D]hearts a-thumpin'
And [C]you, [D]my brown-eyed [G]girl [Em]
[C]You, my [D]brown-eyed girl [G]

[G]Whatever [C]happened [G]to Tuesday and [D]so slow?
[G]Going down the [C]old mine with a [G]transistor [D]radio
[G]Standing in the [C]sunlight laughing,
[G]Hiding behind a [D]rainbow's wall
[G]Slipping and [C]sliding [G]all along the [D]waterfall
With [C]you, [D]my brown-eyed [G]girl [Em]
[C]You, my [D]brown-eyed girl

[D]Do you remember when we used to [G]sing
Sha la la [C]la la la la [G]la la la la te [D]da
Sha la la [G]la la la la [C]la la la la te [G]da, la te [D]da`,
  },
  {
    title: 'Nothing Else Matters',
    author: 'Metallica',
    level: 'intermediate',
    key: 'Em',
    tempo: 69,
    capo_fret: 0,
    chords: 'Em D C G B7 Am',
    strumming_pattern: 'Fingerpicking',
    category: 'Metal',
    release_year: 1991,
    youtube_url: 'https://www.youtube.com/watch?v=tAGnKpE4NCI',
    spotify_link_url: 'https://open.spotify.com/track/0nLiqZ6A27jJri2VCalIUS',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/metallica/nothing-else-matters-chords-8971',
    lyrics_with_chords: `[Em]So close, no matter how [D]far
[C]Couldn't be much more from the [Em]heart
[Em]Forever trusting who we [D]are
[C]And nothing else [B7]matters

[Em]Never opened myself this [D]way
[C]Life is ours, we live it our [Em]way
[Em]All these words I don't just [D]say
[C]And nothing else [B7]matters`,
  },
  {
    title: 'Stairway to Heaven',
    author: 'Led Zeppelin',
    level: 'advanced',
    key: 'Am',
    tempo: 82,
    capo_fret: 0,
    chords: 'Am C D F G Am7 Dsus4',
    strumming_pattern: 'Fingerpicking',
    category: 'Classic Rock',
    release_year: 1971,
    youtube_url: 'https://www.youtube.com/watch?v=QkF3oxziUI4',
    spotify_link_url: 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/led-zeppelin/stairway-to-heaven-chords-9488',
    lyrics_with_chords: `[Am]There's a lady who's [E]sure
All that [C]glitters is [D]gold
And she's [F]buying a stairway to [Am]heaven

[Am]When she [E]gets there she knows
If the [C]stores are all [D]closed
With a [F]word she can get what she [Am]came for
[Am]Ooh, ooh, and she's [G]buying a stairway to [Am]heaven`,
  },
  // ── Polish repertoire ──────────────────────────────────────────────────────
  // Added so the demo studio reads as a Polish one. The harmony below is the
  // common campfire/teaching arrangement, not a transcription — VERIFY against
  // your own charts before leaning on it in front of other teachers.
  // Lyrics are deliberately omitted (still in copyright); the section map is
  // what a teacher actually reads off the screen mid-lesson.
  {
    title: 'Mury',
    author: 'Jacek Kaczmarski',
    level: 'intermediate',
    key: 'Am',
    tempo: 120,
    capo_fret: 0,
    chords: 'Am Dm E7 C G F',
    strumming_pattern: 'Fingerpicking / D DU UDU',
    category: 'Poezja śpiewana',
    release_year: 1978,
    youtube_url: null,
    spotify_link_url: null,
    ultimate_guitar_link: null,
    lyrics_with_chords: `Wstęp: [Am] [Dm] [E7] [Am]

Zwrotka: [Am] [Dm] [E7] [Am]
         [C] [G] [Dm] [E7]

Refren:  [Am] [G] [F] [E7]
         [Am] [Dm] [E7] [Am]

Melodia pochodzi z katalońskiego „L'Estaca" Lluísa Llacha.
Do pracy nad prawą ręką: zwrotki palcami, refren uderzeniem.`,
  },
  {
    title: 'Autobiografia',
    author: 'Perfect',
    level: 'beginner',
    key: 'C',
    tempo: 118,
    capo_fret: 0,
    chords: 'C Am F G',
    strumming_pattern: 'D DU UDU',
    category: 'Polski rock',
    release_year: 1981,
    youtube_url: null,
    spotify_link_url: null,
    ultimate_guitar_link: null,
    lyrics_with_chords: `Zwrotka: [C] [Am] [F] [G]
Refren:  [F] [G] [C] [Am]
         [F] [G] [C]

Cztery akordy na całą piosenkę — dobry pierwszy „prawdziwy" utwór
po opanowaniu zmiany C → Am → F → G.`,
  },
];

// ─── Expanded lesson history ──────────────────────────────────────────────────
// More completed lessons → higher student progress % (lessonsCompleted / 20)
//
// Notes are written headline-first (summary, then an em dash, then the detail)
// because lessonTitleFromNotes() derives the lesson title from the opening
// clause. Keep that shape when editing, or the demo fills up with long titles.

export const STUDENT_LESSONS: Record<string, { notes: string }[]> = {
  [STUDENT_EMAILS.zosia]: [
    {
      notes:
        'Pierwsza lekcja — akordy otwarte G, C, D. Najpierw czysty chwyt, dopiero potem zmiany.',
    },
    {
      notes:
        'Zmiany akordów coraz płynniejsze — wprowadzone bicie do Wonderwall: dół-dół-góra-góra-dół-góra.',
    },
    {
      notes: 'Bicie do Wonderwall opanowane — rytm równy, od następnej lekcji dokładamy metronom.',
    },
    {
      notes:
        'Brown Eyed Girl, progresja zwrotki — G, C, G, D. Tempo do popracowania, na razie wolno i równo.',
    },
    {
      notes:
        'Blackbird, wstęp palcami — kciuk cały czas zakotwiczony na basie. 15 minut dziennie na pierwsze takty.',
    },
    {
      notes:
        'Brown Eyed Girl brzmi już naturalnie — w przyszłym tygodniu dokładamy śpiew, groove ma zostać luźny.',
    },
    {
      notes: 'Blackbird, całe opracowanie się układa — skupiamy się na przejściu basu G → A → H.',
    },
    {
      notes:
        'Wish You Were Here, wstęp — akustyczny wstęp w 90% gotowy. Do dopracowania podciągnięcie na drugiej strunie.',
    },
    {
      notes:
        'Próba estradowa — Wonderwall i Brown Eyed Girl jedno po drugim. Przejścia między utworami do wygładzenia.',
    },
    {
      notes: 'Wish You Were Here w całości — część mostka wymaga powtórek. Dynamika bardzo dobra.',
    },
    {
      notes:
        'Warsztat techniki palcowej — bas naprzemienny, wstęp do Travis picking. Piękny dźwięk.',
    },
    {
      notes:
        'Przegląd repertuaru i nowe cele — Zosia jest gotowa na poziom średni, następne Nothing Else Matters.',
    },
  ],
  [STUDENT_EMAILS.kuba]: [
    {
      notes:
        'Akordy barowe — kształty F i Hm. Poprawiona pozycja nadgarstka: nacisk z kciuka, nie z przedramienia.',
    },
    {
      notes:
        'Hotel California, riff wstępu — pierwsze 8 taktów czysto w 40 BPM. Za tydzień podbijamy do 60 BPM.',
    },
    {
      notes:
        'Riff z Hotel California brzmi świetnie — teraz dynamika, ciche dźwięki mają mieć oddech.',
    },
    {
      notes:
        'Nothing Else Matters, kostkowanie w 60 BPM czysto — podbijamy do 75 BPM i wracamy do separacji strun.',
    },
    {
      notes: 'Hotel California, całość — zwrotka i refren połączone. Solówka rozpisana poglądowo.',
    },
    {
      notes:
        'Mury, wersja palcowa — zwrotki kciukiem, refren uderzeniem. Do popracowania równość basu.',
    },
    {
      notes:
        'Podstawy gitary prowadzącej — pentatonika molowa w pozycji Am. Wprowadzone hammer-on i pull-off.',
    },
    {
      notes:
        'Wstęp do improwizacji — pentatonika na 12-taktowym bluesie. Dobry feeling, do pracy frazowanie.',
    },
  ],
  [STUDENT_EMAILS.maja]: [
    {
      notes: 'Trójkąt G, C, D opanowany z płynnymi zmianami. Świetna postawa od pierwszego dnia.',
    },
    {
      notes:
        'Wprowadzone kapo do Wish You Were Here — pojęcie transpozycji zrozumiane. Cały wstęp codziennie.',
    },
    {
      notes:
        'Brown Eyed Girl, rytm zgrany z podkładem — gotowe do zagrania, można dodać własne bicie.',
    },
    {
      notes:
        'Wonderwall — nauka pełnej formy utworu. Przećwiczone przejścia zwrotka–przedrefren–refren.',
    },
    {
      notes:
        'Autobiografia — cztery akordy, pierwszy utwór zagrany od początku do końca bez zatrzymania.',
    },
    {
      notes:
        'Podstawy gry palcami — kciuk naprzemienny. Blackbird, pierwsze 4 takty w wolnym tempie.',
    },
  ],
  [STUDENT_EMAILS.piotrek]: [
    {
      notes:
        'Budowa gitary, postawa i pierwsze akordy (G, D, Em). Spokojnie — pamięć mięśniowa potrzebuje czasu.',
    },
    {
      notes:
        'Progresje na akordach otwartych — zmiana G → D coraz gładsza. Wprowadzony ruch Em → Am.',
    },
    {
      notes:
        'Rytm zwrotki Wonderwall prawie gotowy — licz na głos podczas grania, wzór dół-góra bywa nierówny.',
    },
    {
      notes: 'Warsztat bicia — trzy wzory. Wprowadzone tłumienie dłonią dla precyzji rytmicznej.',
    },
  ],
};

// lesson_songs per completed lesson index (song title + status)
export const LESSON_SONGS_BY_STUDENT: Record<string, LessonSongSpec[][]> = {
  [STUDENT_EMAILS.zosia]: [
    [
      { title: 'Wonderwall', status: 'to_learn' },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [{ title: 'Wonderwall', status: 'started', notes: 'Skupienie na bicie' }],
    [
      {
        title: 'Wonderwall',
        status: 'started',
        notes: 'Rytm równy, czas na metronom',
      },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'started' },
      { title: 'Wonderwall', status: 'remembered' },
    ],
    [
      { title: 'Blackbird', status: 'to_learn', notes: 'Na razie tylko pierwsze 4 takty' },
      { title: 'Wonderwall', status: 'remembered' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'with_author' },
      { title: 'Blackbird', status: 'started' },
    ],
    [
      { title: 'Blackbird', status: 'remembered' },
      { title: 'Wonderwall', status: 'mastered' },
    ],
    [
      { title: 'Wish You Were Here', status: 'to_learn' },
      { title: 'Blackbird', status: 'remembered' },
    ],
    [
      { title: 'Wonderwall', status: 'mastered' },
      { title: 'Brown Eyed Girl', status: 'mastered' },
    ],
    [
      { title: 'Wish You Were Here', status: 'started' },
      { title: 'Blackbird', status: 'mastered' },
    ],
    [{ title: 'Wish You Were Here', status: 'remembered' }],
    [
      { title: 'Wish You Were Here', status: 'remembered' },
      { title: 'Nothing Else Matters', status: 'to_learn' },
    ],
  ],
  [STUDENT_EMAILS.kuba]: [
    [
      { title: 'Hotel California', status: 'to_learn' },
      { title: 'Nothing Else Matters', status: 'to_learn' },
    ],
    [{ title: 'Hotel California', status: 'started', notes: 'Wstęp w 40 BPM' }],
    [{ title: 'Hotel California', status: 'started', notes: 'Dynamika wstępu' }],
    [
      { title: 'Nothing Else Matters', status: 'started' },
      { title: 'Hotel California', status: 'remembered' },
    ],
    [
      { title: 'Hotel California', status: 'remembered' },
      { title: 'Nothing Else Matters', status: 'started' },
    ],
    [
      { title: 'Mury', status: 'to_learn' },
      { title: 'Hotel California', status: 'mastered' },
    ],
    [
      { title: 'Mury', status: 'started' },
      { title: 'Nothing Else Matters', status: 'remembered' },
    ],
    [
      { title: 'Hotel California', status: 'mastered' },
      { title: 'Mury', status: 'remembered' },
    ],
  ],
  [STUDENT_EMAILS.maja]: [
    [{ title: 'Brown Eyed Girl', status: 'to_learn' }],
    [
      { title: 'Wish You Were Here', status: 'to_learn', notes: 'Kapo na II progu' },
      { title: 'Brown Eyed Girl', status: 'started' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'remembered' },
      { title: 'Wish You Were Here', status: 'started' },
    ],
    [
      { title: 'Wonderwall', status: 'to_learn' },
      { title: 'Brown Eyed Girl', status: 'remembered' },
    ],
    [
      { title: 'Autobiografia', status: 'started' },
      { title: 'Brown Eyed Girl', status: 'mastered' },
    ],
    [
      { title: 'Blackbird', status: 'to_learn' },
      { title: 'Autobiografia', status: 'remembered' },
    ],
  ],
  [STUDENT_EMAILS.piotrek]: [
    [{ title: 'Wonderwall', status: 'to_learn' }],
    [{ title: 'Wonderwall', status: 'to_learn', notes: 'Same akordy, bez bicia' }],
    [{ title: 'Wonderwall', status: 'started' }],
    [
      { title: 'Wonderwall', status: 'started' },
      { title: 'Autobiografia', status: 'to_learn' },
    ],
  ],
};

export const ASSIGNMENTS_BY_STUDENT: Record<string, AssignmentSpec[]> = {
  [STUDENT_EMAILS.zosia]: [
    {
      title: 'Zmiany akordów w Wonderwall',
      description: 'Ćwicz przejścia G → Cadd9 → Dsus4 po 20 minut dziennie. Metronom na 60 BPM.',
      status: 'completed',
      dueDaysFromNow: -7,
    },
    {
      title: 'Blackbird — wstęp palcami',
      description:
        'Naucz się pierwszych 8 taktów Blackbird. Kciuk przez cały czas na strunie basowej.',
      status: 'in_progress',
      dueDaysFromNow: 3,
    },
    {
      title: 'Brown Eyed Girl — nagranie wideo',
      description:
        'Nagraj minutowy filmik ze swoim biciem do Brown Eyed Girl i pokaż go na następnej lekcji.',
      status: 'not_started',
      dueDaysFromNow: 7,
    },
    {
      title: 'Nothing Else Matters — wstęp',
      description:
        'Naucz się charakterystycznego wstępu w 50 BPM. Każdy dźwięk ma wybrzmieć do końca.',
      status: 'not_started',
      dueDaysFromNow: 10,
    },
  ],
  [STUDENT_EMAILS.kuba]: [
    {
      title: 'Hotel California — riff wstępu',
      description: 'Ćwicz wstęp powoli w 50 BPM, pilnując czystej separacji dźwięków i dynamiki.',
      status: 'completed',
      dueDaysFromNow: -5,
    },
    {
      title: 'Nothing Else Matters w 75 BPM',
      description:
        'Podbij tempo kostkowania z 60 na 75 BPM. Nagraj się i odsłuchaj pod kątem równości rytmu.',
      status: 'completed',
      dueDaysFromNow: -1,
    },
    {
      title: 'Mury — rozpisanie akordów',
      description:
        'Rozpisz akordy do zwrotki i refrenu Murów, przećwicz każdą zmianę powoli przed lekcją.',
      status: 'in_progress',
      dueDaysFromNow: 5,
    },
    {
      title: 'Pentatonika — codzienna rozgrzewka',
      description:
        'Przećwicz pentatonikę Am we wszystkich 5 pozycjach — po 5 minut na pozycję z metronomem.',
      status: 'not_started',
      dueDaysFromNow: 8,
    },
  ],
  [STUDENT_EMAILS.maja]: [
    {
      title: 'Wish You Were Here — cały wstęp',
      description:
        'Przećwicz kompletny wstęp z kapo na II progu. Celuj w płynne przejścia między dźwiękami.',
      status: 'completed',
      dueDaysFromNow: -3,
    },
    {
      title: 'Brown Eyed Girl z podkładem',
      description:
        'Zagraj cały utwór z podkładem z YouTube co najmniej 3 razy przed następną lekcją.',
      status: 'completed',
      dueDaysFromNow: -1,
    },
    {
      title: 'Blackbird — pierwsze takty',
      description:
        'Naucz się pierwszych 4 taktów Blackbird. Kciuk zakotwiczony na niskiej strunie E.',
      status: 'in_progress',
      dueDaysFromNow: 4,
    },
  ],
  [STUDENT_EMAILS.piotrek]: [
    {
      title: 'Codzienne przekładanie akordów',
      description:
        'Przekładaj G, D i Em przez 10 minut dziennie. Mierz czas — cel to jedna zmiana na sekundę.',
      status: 'completed',
      dueDaysFromNow: -4,
    },
    {
      title: 'Wonderwall — bicie w zwrotce',
      description:
        'Naucz się wzoru dół-góra w zwrotce Wonderwall. Licz na głos „raz-i-dwa-i-trzy-i-cztery-i".',
      status: 'in_progress',
      dueDaysFromNow: 6,
    },
    {
      title: 'Karta pracy z diagramami akordów',
      description:
        'Uzupełnij z pamięci diagramy akordów G, C, D, Em i Am, potem sprawdź je z tabelą akordów.',
      status: 'not_started',
      dueDaysFromNow: 9,
    },
  ],
};

// ─── This-week lesson schedule ────────────────────────────────────────────────
// Spread across the current week so dashboard shows real activity

export const THIS_WEEK_SCHEDULE: WeekLesson[] = [
  {
    dow: 0,
    hour: 10,
    email: STUDENT_EMAILS.zosia,
    notes: 'Przegląd postępów w Wish You Were Here — cele na tydzień',
  },
  {
    dow: 0,
    hour: 14,
    email: STUDENT_EMAILS.kuba,
    notes: 'Improwizacja dalszy ciąg — frazowanie i dynamika',
  },
  {
    dow: 1,
    hour: 10,
    email: STUDENT_EMAILS.maja,
    notes: 'Blackbird palcami — takty 1-8 w wolnym tempie',
  },
  {
    dow: 1,
    hour: 15,
    email: STUDENT_EMAILS.piotrek,
    notes: 'Szybkość zmian akordów — ćwiczenie z metronomem',
  },
  {
    dow: 2,
    hour: 11,
    email: STUDENT_EMAILS.zosia,
    notes: 'Nothing Else Matters, wstęp — kostkowanie w 50 BPM',
  },
  {
    dow: 3,
    hour: 10,
    email: STUDENT_EMAILS.kuba,
    notes: 'Pentatonika — wszystkie 5 pozycji',
  },
  {
    dow: 3,
    hour: 14,
    email: STUDENT_EMAILS.maja,
    notes: 'Wonderwall — przygotowanie do występu z podkładem',
  },
  {
    dow: 4,
    hour: 10,
    email: STUDENT_EMAILS.piotrek,
    notes: 'Warsztat bicia — dół-góra i tłumienie',
  },
  {
    dow: 4,
    hour: 15,
    email: STUDENT_EMAILS.zosia,
    notes: 'Przegląd repertuaru — próba trzyutworowego setu',
  },
  {
    dow: 5,
    hour: 11,
    email: STUDENT_EMAILS.kuba,
    notes: 'Hotel California w całości — zwrotka i solówka',
  },
];

// ─── Practice, ratings, notifications and requests ────────────────────────────

export const PRACTICE_PLAN: Record<
  string,
  { daysAgo: number; minutes: number; bpm?: number; note?: string }[]
> = {
  [STUDENT_EMAILS.zosia]: [
    { daysAgo: 0, minutes: 35, bpm: 92, note: 'Refren Wonderwall — wreszcie czyste zmiany' },
    { daysAgo: 1, minutes: 25, bpm: 88, note: 'Powolne ćwiczenie zmiany Em7 → G' },
    { daysAgo: 2, minutes: 45, bpm: 85, note: 'Przejście całości, dwa czyste podejścia' },
    { daysAgo: 3, minutes: 20, bpm: 80 },
    { daysAgo: 4, minutes: 30, bpm: 78, note: 'Ćwiczenie bicia z metronomem' },
    { daysAgo: 6, minutes: 40, note: 'Blackbird palcami — wolno, ale równo' },
    { daysAgo: 8, minutes: 25, bpm: 72 },
    { daysAgo: 10, minutes: 50, note: 'Długa sesja, przerobiony mostek' },
    { daysAgo: 12, minutes: 20 },
    { daysAgo: 14, minutes: 35, bpm: 70, note: 'Powrót do podstaw — kształty akordów' },
    { daysAgo: 17, minutes: 30 },
    { daysAgo: 19, minutes: 45, note: 'Nagrałam się — teraz słychać błędy rytmiczne' },
    { daysAgo: 22, minutes: 25, bpm: 65 },
    { daysAgo: 25, minutes: 30 },
  ],
  [STUDENT_EMAILS.kuba]: [
    { daysAgo: 0, minutes: 40, bpm: 110, note: 'Wstęp Hotel California, wreszcie w tempie' },
    { daysAgo: 1, minutes: 30, bpm: 105 },
    { daysAgo: 3, minutes: 55, note: 'Solówka — takt po takcie' },
    { daysAgo: 5, minutes: 25, bpm: 100 },
    { daysAgo: 7, minutes: 35 },
    { daysAgo: 9, minutes: 45, bpm: 95, note: 'Barowe wciąż brzęczą na strunie H' },
    { daysAgo: 13, minutes: 30 },
    { daysAgo: 16, minutes: 40, note: 'Nothing Else Matters — kostkowanie wstępu' },
    { daysAgo: 20, minutes: 20, bpm: 88 },
    { daysAgo: 24, minutes: 35 },
  ],
  [STUDENT_EMAILS.maja]: [
    { daysAgo: 1, minutes: 25, note: 'Brown Eyed Girl — pierwsza cała zwrotka!' },
    { daysAgo: 4, minutes: 20, bpm: 130 },
    { daysAgo: 6, minutes: 30 },
    { daysAgo: 11, minutes: 15, note: 'Krótka sesja, bolą palce' },
    { daysAgo: 15, minutes: 25, bpm: 120 },
    { daysAgo: 21, minutes: 20 },
  ],
  [STUDENT_EMAILS.piotrek]: [
    { daysAgo: 2, minutes: 20, note: 'Zmiany G i C, coraz płynniej' },
    { daysAgo: 7, minutes: 15 },
    { daysAgo: 12, minutes: 25, bpm: 60 },
    { daysAgo: 18, minutes: 20 },
  ],
};

export const SELF_RATINGS: Record<string, { rating: number; note: string }> = {
  [STUDENT_EMAILS.zosia]: {
    rating: 4,
    note: 'Czuję się z tym dobrze — refren wychodzi już automatycznie.',
  },
  [STUDENT_EMAILS.kuba]: { rating: 3, note: 'Wstęp mam pewny, solówka jeszcze do pracy.' },
  [STUDENT_EMAILS.maja]: { rating: 3, note: 'Świetnie się gra! Wciąż za dużo patrzę na ręce.' },
  [STUDENT_EMAILS.piotrek]: {
    rating: 2,
    note: 'Zmiany akordów idą wolno, ale już słychać piosenkę.',
  },
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  // Teacher (Anna) — unread first so the bell shows a count
  {
    recipient: 'teacher',
    type: 'teacher_daily_summary',
    title: 'Twój dzień w skrócie',
    body: 'Dziś 3 zaplanowane lekcje. Zofia Nowak ma zadanie z terminem na jutro.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard',
    actionLabel: 'Otwórz pulpit',
    createdHoursAgo: 3,
  },
  {
    recipient: 'teacher',
    type: 'assignment_completed',
    title: 'Zosia ukończyła zadanie',
    body: 'Zadanie „Zmiany akordów w Wonderwall” zostało oznaczone jako zrobione.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'Zobacz zadania',
    createdHoursAgo: 20,
  },
  {
    recipient: 'teacher',
    type: 'song_mastery_achievement',
    title: 'Kuba opanował utwór',
    body: 'Jakub Wiśniewski przeniósł „Hotel California” do opanowanych.',
    priority: 5,
    isRead: true,
    readHoursAgo: 40,
    actionUrl: '/dashboard/users',
    actionLabel: 'Zobacz ucznia',
    createdHoursAgo: 46,
  },
  {
    recipient: 'teacher',
    type: 'weekly_progress_digest',
    title: 'Podsumowanie tygodnia gotowe',
    body: '4 aktywnych uczniów · 10 lekcji · 34 zapisane sesje ćwiczeń w tym tygodniu.',
    priority: 3,
    isRead: true,
    readHoursAgo: 70,
    createdHoursAgo: 72,
  },
  // Student (Zosia)
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'lesson_reminder_24h',
    title: 'Jutro lekcja o 16:00',
    body: 'Jutro masz lekcję gitary z Anną Kowalską. Weź kapodaster!',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'Zobacz lekcję',
    createdHoursAgo: 2,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'assignment_created',
    title: 'Nowe zadanie od Anny',
    body: 'Przećwicz wzór palcowy z Blackbird — termin za 3 dni.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'Otwórz zadanie',
    createdHoursAgo: 26,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'song_mastery_achievement',
    title: 'Wonderwall opanowany!',
    body: 'Dobra robota — Anna oznaczyła Wonderwall w Twoim repertuarze jako opanowany.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/repertoire',
    actionLabel: 'Zobacz repertuar',
    createdHoursAgo: 50,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'lesson_recap',
    title: 'Podsumowanie lekcji gotowe',
    body: 'Anna dodała notatki z ostatniej lekcji — jest tam, na czym skupić się w tym tygodniu.',
    priority: 3,
    isRead: true,
    readHoursAgo: 60,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'Przeczytaj podsumowanie',
    createdHoursAgo: 74,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'milestone_reached',
    title: '10 ukończonych lekcji',
    body: 'To już 10 lekcji i 12 godzin zapisanych ćwiczeń. Tak trzymaj!',
    priority: 3,
    isRead: true,
    readHoursAgo: 100,
    createdHoursAgo: 120,
  },
  // A couple for the other students so their views aren't bare
  {
    recipient: STUDENT_EMAILS.kuba,
    type: 'assignment_due_reminder',
    title: 'Zadanie z terminem na jutro',
    body: 'Wstęp Hotel California — czyste przejście w 100 BPM.',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'Otwórz zadanie',
    createdHoursAgo: 5,
  },
  {
    recipient: STUDENT_EMAILS.maja,
    type: 'lesson_reminder_24h',
    title: 'Jutro lekcja o 15:00',
    body: 'Jutro masz lekcję gitary z Anną Kowalską.',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'Zobacz lekcję',
    createdHoursAgo: 6,
  },
];

/** The song of the week, named by title so either transport can resolve the id. */
export const SONG_OF_THE_WEEK = {
  songTitle: 'Wish You Were Here',
  teacherMessage:
    'W tym tygodniu bierzemy Wish You Were Here — wstęp to lekcja tego, jak zostawiać przestrzeń. Pozwólcie każdemu akordowi wybrzmieć i nie spieszcie się z pauzami.',
  activeDays: 5,
};

export const DEMO_SONG_REQUESTS: DemoSongRequest[] = [
  {
    student: STUDENT_EMAILS.zosia,
    title: 'Landslide',
    artist: 'Fleetwood Mac',
    url: 'https://www.youtube.com/watch?v=Y0N0mBoc9Sk',
    notes:
      'Moglibyśmy się tego nauczyć? Uwielbiam to granie palcami, wydaje się krok dalej niż Blackbird.',
    status: 'pending',
    createdHoursAgo: 30,
  },
  {
    student: STUDENT_EMAILS.kuba,
    title: 'Sultans of Swing',
    artist: 'Dire Straits',
    notes: 'Wiem, że ambitnie, ale chcę mieć cel do którego dążę.',
    status: 'approved',
    reviewNotes: 'Świetny wybór — zaczniemy od partii rytmicznej i dojdziemy do solówek.',
    createdHoursAgo: 96,
  },
];
