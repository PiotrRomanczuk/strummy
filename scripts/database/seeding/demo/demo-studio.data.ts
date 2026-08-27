/**
 * Picks which language the demo studio speaks.
 *
 * Both transports — the PostgREST seed and the SQL emitter — go through here,
 * so `--locale en` changes what gets written without either of them knowing
 * there is more than one dataset.
 *
 * Polish is the default because that is what production runs: the first
 * campaign is a Facebook post to Polish guitar teachers. English exists so an
 * English-speaking visitor is not dropped into an English interface full of
 * Polish lesson notes.
 */

import { DEMO_PASSWORD as SHARED_DEMO_PASSWORD } from '@/lib/demo/demo-accounts.constants';

import * as en from './demo-studio.en.data';
import * as pl from './demo-studio.pl.data';
import { DEMO_CONTENT_LOCALES, type DemoContentLocale, type DemoStudio } from './demo-studio.types';

export * from './demo-studio.types';

export const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? SHARED_DEMO_PASSWORD;

/** The default when nothing asks otherwise. Production runs this one. */
export const DEFAULT_DEMO_LOCALE: DemoContentLocale = 'pl';

function toStudio(set: typeof pl | typeof en): DemoStudio {
  return {
    users: set.DEMO_USERS,
    studentEmails: set.STUDENT_EMAILS,
    songs: set.DEMO_SONGS,
    lessons: set.STUDENT_LESSONS,
    lessonSongs: set.LESSON_SONGS_BY_STUDENT,
    assignments: set.ASSIGNMENTS_BY_STUDENT,
    weekSchedule: set.THIS_WEEK_SCHEDULE,
    practice: set.PRACTICE_PLAN,
    selfRatings: set.SELF_RATINGS,
    notifications: set.DEMO_NOTIFICATIONS,
    songOfTheWeek: set.SONG_OF_THE_WEEK,
    songRequests: set.DEMO_SONG_REQUESTS,
  };
}

export function getDemoStudio(locale: DemoContentLocale = DEFAULT_DEMO_LOCALE): DemoStudio {
  return toStudio(locale === 'en' ? en : pl);
}

/**
 * Reads `--locale <code>` (or `--locale=<code>`) from argv.
 *
 * Throws on an unknown code rather than falling back: seeding the wrong
 * language into production because of a typo is a worse outcome than a
 * refusal, and the two datasets differ only in prose, so the mistake would
 * not be obvious until someone opened the studio.
 */
export function readLocaleFromArgv(argv: string[] = process.argv): DemoContentLocale {
  const flag = argv.findIndex((a) => a === '--locale' || a.startsWith('--locale='));
  if (flag === -1) return DEFAULT_DEMO_LOCALE;

  const raw = argv[flag].includes('=') ? argv[flag].split('=')[1] : argv[flag + 1];
  if (!raw || !(DEMO_CONTENT_LOCALES as readonly string[]).includes(raw)) {
    throw new Error(
      `Unknown demo locale "${raw ?? ''}". Expected one of: ${DEMO_CONTENT_LOCALES.join(', ')}.`
    );
  }
  return raw as DemoContentLocale;
}

export function lessonTitleFromNotes(notes: string): string {
  const trimmed = notes.trim();
  // Non-greedy: stop at whichever comes first — a spaced em/en dash, a
  // semicolon, or a sentence end. No terminator (short one-liners) means the
  // note IS the title.
  const opening = trimmed.match(/^(.*?)(?:\s+[—–]\s+|;\s+|\.\s+|\.$)/)?.[1]?.trim();
  let title = opening && opening.length >= 8 ? opening : trimmed;
  if (title.length > 60) {
    // Cut on a word boundary — a title severed mid-word reads like a bug.
    const cut = title.slice(0, 60);
    title = `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]+$/, '')}…`;
  }
  return title.replace(/[.,;:]+$/, '');
}
