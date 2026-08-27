/**
 * The demo studio's content, English.
 *
 * The Polish set (`demo-studio.pl.data.ts`) is what production runs, because
 * the first campaign is Polish. This one exists so an English-speaking visitor
 * is not dropped into an English interface full of Polish lesson notes — the
 * landing page and the interest form are already bilingual, and before the
 * studio was translated it was this dataset.
 *
 * The two sets share their ACCOUNTS and differ only in content. The addresses
 * are compiled into the build (see lib/demo/demo-accounts.constants.ts), so
 * they cannot vary by language; only the names attached to them do. That is
 * why the English studio's Emma Johnson signs in as `zosia@strummy.app` — a
 * seam nobody sees, since student addresses appear nowhere in the UI.
 */

import { DEMO_STUDENT_EMAIL, DEMO_TEACHER_EMAIL } from '@/lib/demo/demo-accounts.constants';

import type {
  AssignmentSpec,
  DemoNotification,
  DemoSongRequest,
  LessonSongSpec,
  WeekLesson,
} from './demo-studio.types';

export const DEMO_USERS = [
  { email: DEMO_TEACHER_EMAIL, fullName: 'Sarah Mitchell', isTeacher: true, isStudent: false },
  { email: DEMO_STUDENT_EMAIL, fullName: 'Emma Johnson', isTeacher: false, isStudent: true },
  { email: 'kuba@strummy.app', fullName: 'Carlos Reyes', isTeacher: false, isStudent: true },
  { email: 'maja@strummy.app', fullName: 'Lily Park', isTeacher: false, isStudent: true },
  { email: 'piotrek@strummy.app', fullName: "James O'Brien", isTeacher: false, isStudent: true },
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
    youtube_url: 'https://www.youtube.com/watch?v=hjpF8ukSrvk',
    spotify_link_url: 'https://open.spotify.com/track/7xGfFoTpQ2E7fRF5lN10tr',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/pink-floyd/wish-you-were-here-chords-44555',
    lyrics_with_chords: `[Em7]  [G]  [Em7]  [G]
[Em7]  [A7sus4]  [Em7]  [A7sus4]
[G]  [Em7]  [G]  [Em7]

[C]So, so you think you can [D]tell
Heaven from [Am]hell, blue skies from [G]pain
Can you tell a green [D]field from a cold steel [C]rail?
A smile from a [Am]veil? Do you think you can [G]tell?

[C]Did they get you to [D]trade your heroes for [Am]ghosts?
Hot ashes for [G]trees? Hot air for a cool [D]breeze?
Cold comfort for [C]change? Did you ex[Am]change
A walk-on part in the [G]war for a lead role in a cage?

[Em7]How I wish, [A7sus4]how I wish you were [G]here
We're just [C]two lost souls swimming in a [D]fish bowl
[Am]Year after [G]year
[D]Running over the [C]same old ground
What have we [Am]found? The same old [G]fears
Wish you were [Em7]here [A7sus4] [G]`,
  },
  {
    title: 'Hotel California',
    author: 'Eagles',
    level: 'advanced',
    key: 'Bm',
    tempo: 75,
    capo_fret: 0,
    chords: 'Bm F# A E G D Em',
    strumming_pattern: 'Arpeggios',
    category: 'Classic Rock',
    release_year: 1977,
    youtube_url: 'https://www.youtube.com/watch?v=09839DpTctU',
    spotify_link_url: 'https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190',
    lyrics_with_chords: `[Bm]On a dark desert highway, [F#]cool wind in my hair
[A]Warm smell of colitas, [E]rising up through the air
[G]Up ahead in the distance, [D]I saw a shimmering light
[Em]My head grew heavy and my sight grew dim,
[F#]I had to stop for the night

[Bm]There she stood in the doorway; [F#]I heard the mission bell
[A]And I was thinking to myself, [E]this could be heaven or this could be hell
[G]Then she lit up a candle, [D]and she showed me the way
[Em]There were voices down the corridor,
[F#]I thought I heard them say

[G]Welcome to the [D]Hotel Cali[F#]fornia
Such a [Bm]lovely place, such a lovely [G]face
[D]Plenty of room at the [Em]Hotel Cali[F#]fornia
Any [Em]time of year, you can [F#]find it here`,
  },
  {
    title: 'Blackbird',
    author: 'The Beatles',
    level: 'intermediate',
    key: 'G',
    tempo: 96,
    capo_fret: 0,
    chords: 'G Am G/B C D',
    strumming_pattern: 'Fingerpicking',
    category: 'Folk Rock',
    release_year: 1968,
    youtube_url: 'https://www.youtube.com/watch?v=Man4Xw8Xypo',
    spotify_link_url: 'https://open.spotify.com/track/5jgFfDIR6FR0gvlA56Nakr',
    ultimate_guitar_link: 'https://tabs.ultimate-guitar.com/tab/the-beatles/blackbird-chords-17251',
    lyrics_with_chords: `[G]Blackbird [Am]singing in the [G/B]dead of night
[C]Take these broken [A7]wings and learn to [D]fly [B7] [Em]
[G]All your [C]life
[A7]You were only [D]waiting for this [G]moment to arise

[G]Blackbird [Am]singing in the [G/B]dead of night
[C]Take these sunken [A7]eyes and learn to [D]see [B7] [Em]
[G]All your [C]life
[A7]You were only [D]waiting for this [G]moment to be free

[F]Black[C]bird, [Bb6]fly [A7]
[F]Black[C]bird, [Bb6]fly [A7]
[D]Into the [Db]light of the [D]dark black [G]night`,
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
    chords: 'Em Am C D G B7',
    strumming_pattern: 'Fingerpicking',
    category: 'Metal Ballad',
    release_year: 1991,
    youtube_url: 'https://www.youtube.com/watch?v=tAGnKpE4NCI',
    spotify_link_url: 'https://open.spotify.com/track/0nLiqZ6A27jJri2VCalIUs',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/metallica/nothing-else-matters-chords-8547',
    lyrics_with_chords: `[Em]So close no matter [D]how far
[C]Couldn't be much more [Em]from the heart
[Em]Forever trusting [D]who we are
[C]And nothing else [G]ma[B7]tters

[Em]Never opened [D]myself this way
[C]Life is ours, we live it [Em]our way
[Em]All these words I [D]don't just say
[C]And nothing else [G]ma[B7]tters

[Em]Trust I seek and [D]I find in you
[C]Every day for us [Em]something new
[Em]Open mind for a [D]different view
[C]And nothing else [G]ma[B7]tters

[Am]Never cared for what they [C]do
[Am]Never cared for what they [D]know
[Em]But I know`,
  },
  {
    title: 'Stairway to Heaven',
    author: 'Led Zeppelin',
    level: 'advanced',
    key: 'Am',
    tempo: 82,
    capo_fret: 0,
    chords: 'Am E+ C D Fmaj7 G',
    strumming_pattern: 'Fingerpicking',
    category: 'Classic Rock',
    release_year: 1971,
    youtube_url: 'https://www.youtube.com/watch?v=QkF3oxziUI4',
    spotify_link_url: 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc',
    ultimate_guitar_link:
      'https://tabs.ultimate-guitar.com/tab/led-zeppelin/stairway-to-heaven-chords-9562',
    lyrics_with_chords: `[Am]There's a [E+]lady who's [C]sure
All that [D]glitters is [Fmaj7]gold
And she's [Am]buying a [E+]stairway to [C]hea[D]ven

[Am]When she [E+]gets there she [C]knows
If the [D]stores are all [Fmaj7]closed
With a [Am]word she can [E+]get what she [C]came [D]for

[C]Ooh [D]ooh [Fmaj7]ooh [Am]ooh
And she's [C]buying a [G]stairway to [Am]heaven

[C]There's a [D]sign on the [Fmaj7]wall
But she [Am]wants to be [C]sure
'Cause you [D]know sometimes [Fmaj7]words have two [Am]meanings
[C]In a [D]tree by the [Fmaj7]brook
There's a [Am]songbird who [C]sings
Sometimes [D]all of our [Fmaj7]thoughts are [Am]misgiven`,
  },
];

export const STUDENT_LESSONS: Record<string, { notes: string }[]> = {
  [STUDENT_EMAILS.zosia]: [
    {
      notes:
        'Great first session — G, C, D open chords introduced. Focus on clean chord shapes before transitions.',
    },
    {
      notes:
        'Chord transitions improving. Introduced Wonderwall strumming — down-down-up-up-down-up.',
    },
    {
      notes:
        'Wonderwall strumming pattern locked in. Timing is solid; start syncing with a metronome next session.',
    },
    {
      notes:
        'Brown Eyed Girl verse progression — G, C, G, D. Tempo needs work; keep it slow and steady.',
    },
    {
      notes:
        'Blackbird fingerpicking intro attempted — keep left-hand thumb anchored. 15 mins daily on the opening bars.',
    },
    {
      notes:
        'Brown Eyed Girl progression feels natural now. Ready to add vocals next week; keep the groove loose.',
    },
    {
      notes:
        'Blackbird full arrangement coming together. Focus on the bass-note walk from G to A to Bm.',
    },
    {
      notes:
        'Wish You Were Here intro — the acoustic intro is 90% there. Nail the bend on the 2nd string.',
    },
    {
      notes:
        'Performance practice: Wonderwall + Brown Eyed Girl back-to-back. Transitions between songs need smoothing.',
    },
    {
      notes:
        'Wish You Were Here full song — bridge section needs repetition. Great dynamics throughout.',
    },
    {
      notes:
        'Fingerpicking technique workshop — alternating bass patterns, Travis picking intro. Beautiful tone.',
    },
    {
      notes:
        'Repertoire review + setting new goals. Emma is ready for intermediate material — Nothing Else Matters next.',
    },
  ],
  [STUDENT_EMAILS.kuba]: [
    {
      notes:
        'Barre chords introduced — F and Bm shapes. Wrist position corrected; squeeze from the thumb, not the forearm.',
    },
    {
      notes:
        'Hotel California intro riff — first 8 bars clean at 40 BPM. Bumping to 60 BPM next week.',
    },
    {
      notes:
        'Hotel California intro riff sounding great. Work on dynamics: let the quiet notes breathe.',
    },
    {
      notes:
        'Nothing Else Matters picking pattern at 60 BPM is clean. Bump to 75 BPM and revisit string separation.',
    },
    {
      notes:
        'Hotel California full arrangement — verse + chorus connected. Solo section outlined for reference.',
    },
    {
      notes:
        'Stairway to Heaven intro — classical fingerpicking section. Focus on the descending bass line.',
    },
    {
      notes:
        'Lead guitar basics — minor pentatonic in Am position. Hammer-ons and pull-offs introduced.',
    },
    {
      notes:
        'Solo improvisation intro — pentatonic over a 12-bar blues backing. Great feel, work on phrasing.',
    },
  ],
  [STUDENT_EMAILS.maja]: [
    {
      notes:
        'G, C, D chord triangle mastered with smooth transitions. Excellent posture from day one.',
    },
    {
      notes:
        'Capo introduced for Wish You Were Here — key transposition concept understood. Practice the full intro daily.',
    },
    {
      notes:
        'Brown Eyed Girl timing locked in with backing track. Ready to perform — add your own strumming flair.',
    },
    {
      notes:
        'Wonderwall — learning the full song structure. Verse-prechorus-chorus transitions practiced.',
    },
    {
      notes:
        'Performance ready — Brown Eyed Girl with confidence. Started exploring Blackbird fingerpicking.',
    },
    {
      notes:
        'Fingerpicking foundations — alternating thumb technique. Blackbird opening 4 bars at slow tempo.',
    },
  ],
  [STUDENT_EMAILS.piotrek]: [
    {
      notes:
        'Guitar anatomy, posture, and first chord shapes (G, D, Em) covered. Take it slow — muscle memory takes time.',
    },
    {
      notes:
        'Open chord progressions improving. G to D transitions getting smoother. Introduced Em → Am movement.',
    },
    {
      notes:
        'Wonderwall verse rhythm is almost there; count out loud while strumming. Down-up pattern needs consistency.',
    },
    {
      notes:
        'Strumming patterns workshop — 3 patterns learned. Muting technique introduced for rhythmic precision.',
    },
  ],
};

export const LESSON_SONGS_BY_STUDENT: Record<string, LessonSongSpec[][]> = {
  [STUDENT_EMAILS.zosia]: [
    [
      { title: 'Wonderwall', status: 'to_learn' },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [{ title: 'Wonderwall', status: 'started', notes: 'Focus on strumming pattern' }],
    [
      {
        title: 'Wonderwall',
        status: 'started',
        notes: 'Verse strumming pattern — keep tempo steady',
      },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'started' },
      { title: 'Wonderwall', status: 'remembered' },
    ],
    [
      { title: 'Blackbird', status: 'to_learn', notes: 'Focus on first 4 bars only' },
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
    [{ title: 'Hotel California', status: 'started', notes: 'First 8 bars at 40 BPM' }],
    [
      {
        title: 'Hotel California',
        status: 'started',
        notes: 'Nail the dynamics in the intro riff',
      },
      { title: 'Nothing Else Matters', status: 'started' },
    ],
    [
      { title: 'Nothing Else Matters', status: 'remembered' },
      { title: 'Hotel California', status: 'remembered' },
    ],
    [
      { title: 'Hotel California', status: 'with_author' },
      { title: 'Stairway to Heaven', status: 'to_learn' },
    ],
    [{ title: 'Stairway to Heaven', status: 'started', notes: 'Classical fingerpicking section' }],
    [
      { title: 'Stairway to Heaven', status: 'started' },
      { title: 'Nothing Else Matters', status: 'mastered' },
    ],
    [{ title: 'Stairway to Heaven', status: 'remembered' }],
  ],
  [STUDENT_EMAILS.maja]: [
    [
      { title: 'Brown Eyed Girl', status: 'to_learn' },
      { title: 'Wish You Were Here', status: 'to_learn' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'started' },
      { title: 'Wish You Were Here', status: 'started', notes: 'Capo 2 — practice the full intro' },
    ],
    [
      { title: 'Brown Eyed Girl', status: 'with_author', notes: 'Performance-ready!' },
      { title: 'Wish You Were Here', status: 'remembered' },
    ],
    [
      { title: 'Wonderwall', status: 'to_learn' },
      { title: 'Brown Eyed Girl', status: 'mastered' },
    ],
    [
      { title: 'Wonderwall', status: 'started' },
      { title: 'Blackbird', status: 'to_learn' },
    ],
    [
      { title: 'Blackbird', status: 'started' },
      { title: 'Wonderwall', status: 'remembered' },
    ],
  ],
  [STUDENT_EMAILS.piotrek]: [
    [{ title: 'Wonderwall', status: 'to_learn' }],
    [
      { title: 'Wonderwall', status: 'to_learn' },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [
      { title: 'Wonderwall', status: 'started' },
      { title: 'Brown Eyed Girl', status: 'to_learn' },
    ],
    [{ title: 'Wonderwall', status: 'started', notes: 'Keep counting out loud' }],
  ],
};

export const ASSIGNMENTS_BY_STUDENT: Record<string, AssignmentSpec[]> = {
  [STUDENT_EMAILS.zosia]: [
    {
      title: 'Wonderwall chord transitions',
      description:
        'Practice G → Cadd9 → Dsus4 transitions for 20 minutes daily. Use a metronome at 60 BPM.',
      status: 'completed',
      dueDaysFromNow: -7,
    },
    {
      title: 'Blackbird intro fingerpicking',
      description:
        'Learn the opening 8 bars of Blackbird. Keep the thumb on the bass string at all times.',
      status: 'in_progress',
      dueDaysFromNow: 3,
    },
    {
      title: 'Brown Eyed Girl video recording',
      description:
        'Record a 1-minute clip of your Brown Eyed Girl strumming and share it in the next lesson.',
      status: 'not_started',
      dueDaysFromNow: 7,
    },
    {
      title: 'Nothing Else Matters intro',
      description:
        'Learn the iconic picking intro at 50 BPM. Focus on letting each note ring clearly.',
      status: 'not_started',
      dueDaysFromNow: 10,
    },
  ],
  [STUDENT_EMAILS.kuba]: [
    {
      title: 'Hotel California intro riff',
      description:
        'Practice the iconic intro slowly at 50 BPM, focusing on clean note separation and dynamics.',
      status: 'completed',
      dueDaysFromNow: -5,
    },
    {
      title: 'Nothing Else Matters at 75 BPM',
      description:
        'Bump the picking pattern tempo from 60 to 75 BPM. Record yourself and listen back for timing accuracy.',
      status: 'completed',
      dueDaysFromNow: -1,
    },
    {
      title: 'Stairway to Heaven chord research',
      description:
        'Look up the chord shapes for Stairway to Heaven and practice each one slowly before the next session.',
      status: 'in_progress',
      dueDaysFromNow: 5,
    },
    {
      title: 'Pentatonic scale daily drill',
      description:
        'Run through the Am pentatonic in all 5 positions — 5 minutes each position with a metronome.',
      status: 'not_started',
      dueDaysFromNow: 8,
    },
  ],
  [STUDENT_EMAILS.maja]: [
    {
      title: 'Wish You Were Here full intro',
      description:
        'Practice the complete intro with capo on fret 2. Aim for smooth note transitions throughout.',
      status: 'completed',
      dueDaysFromNow: -3,
    },
    {
      title: 'Brown Eyed Girl with backing track',
      description:
        'Play through the full song with a YouTube backing track at least 3 times before the next lesson.',
      status: 'completed',
      dueDaysFromNow: -1,
    },
    {
      title: 'Blackbird opening bars',
      description:
        'Learn the first 4 bars of Blackbird fingerpicking. Keep thumb anchored on the low E string.',
      status: 'in_progress',
      dueDaysFromNow: 4,
    },
  ],
  [STUDENT_EMAILS.piotrek]: [
    {
      title: 'Daily chord switching practice',
      description:
        'Switch between G, D, and Em for 10 minutes every day. Time yourself — aim for 1 switch per second.',
      status: 'completed',
      dueDaysFromNow: -4,
    },
    {
      title: 'Wonderwall verse strumming',
      description:
        'Learn the down-up strumming pattern for the Wonderwall verse. Count "1-and-2-and-3-and-4-and" out loud.',
      status: 'in_progress',
      dueDaysFromNow: 6,
    },
    {
      title: 'Chord diagram worksheet',
      description:
        'Fill in the chord diagrams for G, C, D, Em, and Am from memory. Check against your chord chart after.',
      status: 'not_started',
      dueDaysFromNow: 9,
    },
  ],
};

export const THIS_WEEK_SCHEDULE: WeekLesson[] = [
  {
    dow: 0,
    hour: 10,
    email: STUDENT_EMAILS.zosia,
    notes: 'Review Wish You Were Here progress + set weekly goals',
  },
  {
    dow: 0,
    hour: 14,
    email: STUDENT_EMAILS.kuba,
    notes: 'Solo improvisation continued — phrasing and dynamics',
  },
  {
    dow: 1,
    hour: 10,
    email: STUDENT_EMAILS.maja,
    notes: 'Blackbird fingerpicking — bars 1-8 at slow tempo',
  },
  {
    dow: 1,
    hour: 15,
    email: STUDENT_EMAILS.piotrek,
    notes: 'Chord transitions speed drill + metronome work',
  },
  {
    dow: 2,
    hour: 11,
    email: STUDENT_EMAILS.zosia,
    notes: 'Nothing Else Matters intro — picking pattern at 50 BPM',
  },
  {
    dow: 3,
    hour: 10,
    email: STUDENT_EMAILS.kuba,
    notes: 'Pentatonic scale patterns — all 5 positions',
  },
  {
    dow: 3,
    hour: 14,
    email: STUDENT_EMAILS.maja,
    notes: 'Wonderwall performance prep with backing track',
  },
  {
    dow: 4,
    hour: 10,
    email: STUDENT_EMAILS.piotrek,
    notes: 'Strumming pattern workshop — down-up and muting',
  },
  {
    dow: 4,
    hour: 15,
    email: STUDENT_EMAILS.zosia,
    notes: 'Repertoire run-through: 3-song setlist practice',
  },
  {
    dow: 5,
    hour: 11,
    email: STUDENT_EMAILS.kuba,
    notes: 'Hotel California full arrangement — verse + solo',
  },
];

export const PRACTICE_PLAN: Record<
  string,
  { daysAgo: number; minutes: number; bpm?: number; note?: string }[]
> = {
  [STUDENT_EMAILS.zosia]: [
    { daysAgo: 0, minutes: 35, bpm: 92, note: 'Wonderwall chorus — clean transitions at last' },
    { daysAgo: 1, minutes: 25, bpm: 88, note: 'Slow practice on the Em7 → G change' },
    { daysAgo: 2, minutes: 45, bpm: 85, note: 'Full run-through, two clean takes' },
    { daysAgo: 3, minutes: 20, bpm: 80 },
    { daysAgo: 4, minutes: 30, bpm: 78, note: 'Strumming pattern drill with metronome' },
    { daysAgo: 6, minutes: 40, note: 'Blackbird fingerpicking — slow but steady' },
    { daysAgo: 8, minutes: 25, bpm: 72 },
    { daysAgo: 10, minutes: 50, note: 'Long session, worked through the bridge' },
    { daysAgo: 12, minutes: 20 },
    { daysAgo: 14, minutes: 35, bpm: 70, note: 'Back to basics on chord shapes' },
    { daysAgo: 17, minutes: 30 },
    { daysAgo: 19, minutes: 45, note: 'Recorded myself — hearing the timing issues now' },
    { daysAgo: 22, minutes: 25, bpm: 65 },
    { daysAgo: 25, minutes: 30 },
  ],
  [STUDENT_EMAILS.kuba]: [
    { daysAgo: 0, minutes: 40, bpm: 110, note: 'Hotel California intro, finally under tempo' },
    { daysAgo: 1, minutes: 30, bpm: 105 },
    { daysAgo: 3, minutes: 55, note: 'Solo section — bar by bar' },
    { daysAgo: 5, minutes: 25, bpm: 100 },
    { daysAgo: 7, minutes: 35 },
    { daysAgo: 9, minutes: 45, bpm: 95, note: 'Barre chords still buzzing on the B string' },
    { daysAgo: 13, minutes: 30 },
    { daysAgo: 16, minutes: 40, note: 'Nothing Else Matters intro picking' },
    { daysAgo: 20, minutes: 20, bpm: 88 },
    { daysAgo: 24, minutes: 35 },
  ],
  [STUDENT_EMAILS.maja]: [
    { daysAgo: 1, minutes: 25, note: 'Brown Eyed Girl — first full verse!' },
    { daysAgo: 4, minutes: 20, bpm: 130 },
    { daysAgo: 6, minutes: 30 },
    { daysAgo: 11, minutes: 15, note: 'Short session, fingers sore' },
    { daysAgo: 15, minutes: 25, bpm: 120 },
    { daysAgo: 21, minutes: 20 },
  ],
  [STUDENT_EMAILS.piotrek]: [
    { daysAgo: 2, minutes: 20, note: 'G and C changes, getting smoother' },
    { daysAgo: 7, minutes: 15 },
    { daysAgo: 12, minutes: 25, bpm: 60 },
    { daysAgo: 18, minutes: 20 },
  ],
};

export const SELF_RATINGS: Record<string, { rating: number; note: string }> = {
  [STUDENT_EMAILS.zosia]: {
    rating: 4,
    note: 'Feeling good about this one — the chorus is automatic now.',
  },
  [STUDENT_EMAILS.kuba]: { rating: 3, note: 'Intro is solid, the solo still needs work.' },
  [STUDENT_EMAILS.maja]: { rating: 3, note: 'Fun to play! Still looking at my hands too much.' },
  [STUDENT_EMAILS.piotrek]: {
    rating: 2,
    note: 'Chord changes are slow but I can hear the song now.',
  },
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  // Teacher (Sarah) — unread first so the bell shows a count
  {
    recipient: 'teacher',
    type: 'teacher_daily_summary',
    title: 'Your day at a glance',
    body: '3 lessons scheduled today. Emma Johnson has an assignment due tomorrow.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard',
    actionLabel: 'Open dashboard',
    createdHoursAgo: 3,
  },
  {
    recipient: 'teacher',
    type: 'assignment_completed',
    title: 'Emma completed an assignment',
    body: '"Practice the Wonderwall chorus transition" was marked complete.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'View assignments',
    createdHoursAgo: 20,
  },
  {
    recipient: 'teacher',
    type: 'song_mastery_achievement',
    title: 'Carlos mastered a song',
    body: 'Carlos Reyes moved "Hotel California" to mastered.',
    priority: 5,
    isRead: true,
    readHoursAgo: 40,
    actionUrl: '/dashboard/users',
    actionLabel: 'View student',
    createdHoursAgo: 46,
  },
  {
    recipient: 'teacher',
    type: 'weekly_progress_digest',
    title: 'Weekly summary ready',
    body: '4 active students · 10 lessons · 34 practice sessions logged this week.',
    priority: 3,
    isRead: true,
    readHoursAgo: 70,
    createdHoursAgo: 72,
  },
  // Student (Emma)
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'lesson_reminder_24h',
    title: 'Lesson tomorrow at 16:00',
    body: 'Your guitar lesson with Sarah Mitchell is tomorrow. Bring your capo!',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'View lesson',
    createdHoursAgo: 2,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'assignment_created',
    title: 'New assignment from Sarah',
    body: 'Practice the Blackbird fingerpicking pattern — due in 3 days.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'Open assignment',
    createdHoursAgo: 26,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'song_mastery_achievement',
    title: 'Wonderwall mastered!',
    body: 'Nice work — Sarah marked Wonderwall as mastered in your repertoire.',
    priority: 5,
    isRead: false,
    actionUrl: '/dashboard/repertoire',
    actionLabel: 'See repertoire',
    createdHoursAgo: 50,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'lesson_recap',
    title: 'Lesson recap available',
    body: 'Sarah added notes from your last lesson, including what to focus on this week.',
    priority: 3,
    isRead: true,
    readHoursAgo: 60,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'Read recap',
    createdHoursAgo: 74,
  },
  {
    recipient: STUDENT_EMAILS.zosia,
    type: 'milestone_reached',
    title: '10 lessons completed',
    body: "That's 10 lessons and 12 hours of practice logged. Keep going!",
    priority: 3,
    isRead: true,
    readHoursAgo: 100,
    createdHoursAgo: 120,
  },
  // A couple for the other students so their views aren't bare
  {
    recipient: STUDENT_EMAILS.kuba,
    type: 'assignment_due_reminder',
    title: 'Assignment due tomorrow',
    body: 'Hotel California intro — clean run at 100 bpm.',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/assignments',
    actionLabel: 'Open assignment',
    createdHoursAgo: 5,
  },
  {
    recipient: STUDENT_EMAILS.maja,
    type: 'lesson_reminder_24h',
    title: 'Lesson tomorrow at 15:00',
    body: 'Your guitar lesson with Sarah Mitchell is tomorrow.',
    priority: 8,
    isRead: false,
    actionUrl: '/dashboard/lessons',
    actionLabel: 'View lesson',
    createdHoursAgo: 6,
  },
];

export const SONG_OF_THE_WEEK = {
  songTitle: 'Wish You Were Here',
  teacherMessage:
    "This week we're looking at Wish You Were Here — the intro is a masterclass in leaving space. Focus on letting each chord ring, and don't rush the pauses.",
  activeDays: 5,
};

export const DEMO_SONG_REQUESTS: DemoSongRequest[] = [
  {
    student: STUDENT_EMAILS.zosia,
    title: 'Landslide',
    artist: 'Fleetwood Mac',
    url: 'https://www.youtube.com/watch?v=Y0N0mBoc9Sk',
    notes:
      'Could we learn this one? I love the fingerpicking and it feels like a step up from Blackbird.',
    status: 'pending',
    createdHoursAgo: 30,
  },
  {
    student: STUDENT_EMAILS.kuba,
    title: 'Sultans of Swing',
    artist: 'Dire Straits',
    notes: 'Ambitious I know, but I want something to work toward.',
    status: 'approved',

    reviewNotes: "Great pick — let's start with the rhythm part and build up to the solos.",
    createdHoursAgo: 96,
  },
];
