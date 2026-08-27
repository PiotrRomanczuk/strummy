import {
  DEFAULT_DEMO_LOCALE,
  getDemoStudio,
  readLocaleFromArgv,
} from '@/scripts/database/seeding/demo/demo-studio.data';
import { DEMO_CONTENT_LOCALES } from '@/scripts/database/seeding/demo/demo-studio.types';
import { DEMO_TEACHER_EMAIL } from '@/lib/demo/demo-accounts.constants';

/**
 * The demo studio ships in two languages. They are two prose sets over ONE set
 * of accounts, so the risk is not a bad translation — it is one language
 * quietly seeding a thinner studio than the other, which nobody notices until
 * a visitor lands in the sparse one.
 *
 * These tests compare the two structurally and pin the account sharing that
 * makes the split safe: the addresses are compiled into the build, so they
 * must not vary by language even though the names do.
 */

const pl = getDemoStudio('pl');
const en = getDemoStudio('en');

describe('demo studio locales', () => {
  it('defaults to the language production runs', () => {
    expect(DEFAULT_DEMO_LOCALE).toBe('pl');
    expect(getDemoStudio().users).toEqual(pl.users);
  });

  it('uses the same accounts in both languages', () => {
    // The sign-in button has one address compiled into it. If a language
    // changed the addresses, seeding that language would break the button.
    expect(en.users.map((u) => u.email)).toEqual(pl.users.map((u) => u.email));
    expect(en.studentEmails).toEqual(pl.studentEmails);
    expect(pl.users.find((u) => u.isTeacher)?.email).toBe(DEMO_TEACHER_EMAIL);
  });

  it('gives every account a different name per language', () => {
    expect(en.users.map((u) => u.fullName)).not.toEqual(pl.users.map((u) => u.fullName));
    for (const user of [...pl.users, ...en.users]) {
      expect(user.fullName.trim().length).toBeGreaterThan(0);
    }
  });

  it('builds a studio of the same size in both languages', () => {
    const students = pl.users.filter((u) => u.isStudent).map((u) => u.email);

    for (const email of students) {
      expect(en.lessons[email]).toHaveLength(pl.lessons[email].length);
      expect(en.assignments[email]).toHaveLength(pl.assignments[email].length);
      expect(en.lessonSongs[email]).toHaveLength(pl.lessonSongs[email].length);
      expect(en.practice[email]).toHaveLength(pl.practice[email].length);
      expect(en.selfRatings[email]).toBeDefined();
    }

    expect(en.weekSchedule).toHaveLength(pl.weekSchedule.length);
    expect(en.notifications).toHaveLength(pl.notifications.length);
    expect(en.songRequests).toHaveLength(pl.songRequests.length);
  });

  it('points the song of the week at a song the studio actually carries', () => {
    for (const studio of [pl, en]) {
      const titles = studio.songs.map((s) => s.title);
      expect(titles).toContain(studio.songOfTheWeek.songTitle);
    }
  });

  it('references only songs that exist in its own catalogue', () => {
    for (const studio of [pl, en]) {
      const titles = new Set(studio.songs.map((s) => s.title));
      for (const perLesson of Object.values(studio.lessonSongs)) {
        for (const spec of perLesson.flat()) {
          expect(titles.has(spec.title)).toBe(true);
        }
      }
    }
  });

  it('addresses every notification to the teacher or a seeded student', () => {
    const known = new Set<string>(['teacher', ...pl.users.map((u) => u.email)]);
    for (const studio of [pl, en]) {
      for (const notification of studio.notifications) {
        expect(known.has(notification.recipient)).toBe(true);
      }
    }
  });

  describe('readLocaleFromArgv', () => {
    it('falls back to the default when no flag is given', () => {
      expect(readLocaleFromArgv(['node', 'script.ts'])).toBe(DEFAULT_DEMO_LOCALE);
    });

    it('accepts both flag spellings', () => {
      expect(readLocaleFromArgv(['node', 's', '--locale', 'en'])).toBe('en');
      expect(readLocaleFromArgv(['node', 's', '--locale=en'])).toBe('en');
    });

    it('refuses an unknown language rather than guessing', () => {
      // Silently defaulting would seed the wrong prose into production, and
      // the two sets differ only in words — nobody would spot it until they
      // opened the studio.
      expect(() => readLocaleFromArgv(['node', 's', '--locale', 'de'])).toThrow(/Unknown demo/);
      expect(() => readLocaleFromArgv(['node', 's', '--locale'])).toThrow(/Unknown demo/);
    });

    it('covers every declared locale', () => {
      for (const locale of DEMO_CONTENT_LOCALES) {
        expect(getDemoStudio(locale).users.length).toBeGreaterThan(0);
      }
    });
  });
});
