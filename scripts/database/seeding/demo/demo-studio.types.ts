/**
 * Shapes shared by every language variant of the demo studio.
 *
 * Split out so `demo-studio.pl.data.ts` and `demo-studio.en.data.ts` cannot
 * drift into two subtly different shapes — the whole point of the split is
 * that a transport can render either set without knowing which it has.
 */

export type LessonSongSpec = { title: string; status: string; notes?: string };

export type AssignmentSpec = {
  title: string;
  description: string;
  status: string;
  dueDaysFromNow: number;
};

export interface WeekLesson {
  dow: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number;
  email: string;
  notes: string;
}

/**
 * `recipient` is symbolic — 'teacher', or a student's address. Both transports
 * resolve it to a profile id at write time, because neither knows the ids
 * until the accounts exist.
 */
export type DemoNotification = {
  recipient: 'teacher' | string;
  type: string;
  title: string;
  body: string;
  priority: number;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdHoursAgo: number;
  readHoursAgo?: number;
};

export type DemoSongRequest = {
  student: string;
  title: string;
  artist: string;
  url?: string;
  notes: string;
  status: string;
  reviewNotes?: string;
  createdHoursAgo: number;
};

export type DemoUser = {
  readonly email: string;
  readonly fullName: string;
  readonly isTeacher: boolean;
  readonly isStudent: boolean;
};

export type DemoSong = Record<string, unknown> & { title: string };

/** One complete studio: the same accounts, told in one language. */
export interface DemoStudio {
  users: readonly DemoUser[];
  studentEmails: Readonly<Record<'zosia' | 'kuba' | 'maja' | 'piotrek', string>>;
  songs: DemoSong[];
  lessons: Record<string, { notes: string }[]>;
  lessonSongs: Record<string, LessonSongSpec[][]>;
  assignments: Record<string, AssignmentSpec[]>;
  weekSchedule: WeekLesson[];
  practice: Record<string, { daysAgo: number; minutes: number; bpm?: number; note?: string }[]>;
  selfRatings: Record<string, { rating: number; note: string }>;
  notifications: DemoNotification[];
  songOfTheWeek: { songTitle: string; teacherMessage: string; activeDays: number };
  songRequests: DemoSongRequest[];
}

/** The languages the studio's content is written in. Not the app's locales. */
export const DEMO_CONTENT_LOCALES = ['pl', 'en'] as const;
export type DemoContentLocale = (typeof DEMO_CONTENT_LOCALES)[number];
