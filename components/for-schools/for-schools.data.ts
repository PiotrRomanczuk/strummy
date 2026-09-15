/**
 * Structural data for the `/for-schools` marketing page. Prose lives in
 * `messages/*.json` under `ForSchools` — only shapes, times and the fictional
 * names inside the sample timetable belong here.
 *
 * The names are invented (same rule as `landing.data.ts`): never a real
 * student, parent or teacher.
 */

export type SubjectKey = 'guitar' | 'piano' | 'violin' | 'vocals' | 'drums';

export type TimetableCell =
  /** An ordinary lesson: subject, who is taught, who teaches. */
  | { kind: 'lesson'; subject: SubjectKey; student: string; teacher: string }
  /** The 17:00 piano slot — the one the page exists to explain. */
  | { kind: 'cover'; subject: SubjectKey; absent: string; cover: string };

export const TIMETABLE_ROOMS = [1, 2, 3] as const;

export const TIMETABLE: { time: string; cells: TimetableCell[] }[] = [
  {
    time: '16:00',
    cells: [
      { kind: 'lesson', subject: 'guitar', student: 'Emilia W.', teacher: 'Marek Z.' },
      { kind: 'lesson', subject: 'piano', student: 'Jan K.', teacher: 'Anna L.' },
      { kind: 'lesson', subject: 'violin', student: 'Zofia P.', teacher: 'Ewa T.' },
    ],
  },
  {
    time: '17:00',
    cells: [
      { kind: 'lesson', subject: 'guitar', student: 'Filip N.', teacher: 'Marek Z.' },
      { kind: 'cover', subject: 'piano', absent: 'Anna L.', cover: 'Piotr S.' },
      { kind: 'lesson', subject: 'vocals', student: 'Maja R.', teacher: 'Ewa T.' },
    ],
  },
  {
    time: '18:00',
    cells: [
      { kind: 'lesson', subject: 'drums', student: 'Adam B.', teacher: 'Tomasz H.' },
      { kind: 'lesson', subject: 'piano', student: 'Nina C.', teacher: 'Piotr S.' },
      { kind: 'lesson', subject: 'violin', student: 'Olga D.', teacher: 'Ewa T.' },
    ],
  },
];

/** Both columns of the before/after comparison run to the same clock. */
export const SCHOOL_DAY_TIMES = ['8:10', '9:30', '16:45', '21:00'];

export const FEATURE_KEYS = ['schedule', 'payroll', 'students', 'instruments'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export const FEATURE_POINTS = 3;

export const TIER_KEYS = ['small', 'school', 'network'] as const;
export type TierKey = (typeof TIER_KEYS)[number];
/** The School tier earns one extra line — migration is what sells it. */
export const TIER_POINTS: Record<TierKey, number> = { small: 3, school: 4, network: 3 };

export const FAQ_COUNT = 5;
export const FOUNDER_FACTS = 4;

/**
 * Where a school actually reaches a human.
 *
 * NOT `kontakt@strummy.online`: the domain is verified for *sending* only (see
 * `MAIL_REPLY_TO` in `lib/email/smtp-client.ts`), so mail to any address on it
 * bounces — a contact link that silently loses leads is worse than none. The
 * public landing footer already points at the same inbox.
 */
export const SCHOOL_CONTACT = {
  email: 'p.romanczuk@gmail.com',
  phoneHref: 'tel:+48513602768',
} as const;

/** Anchor ids the page's own nav links at. */
export const SCHOOL_ANCHORS = { how: 'how-it-works', pricing: 'pricing', call: 'book-a-call' };
