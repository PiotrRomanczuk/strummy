/**
 * What to photograph, and which Claude Design artboard each shot answers to.
 *
 * The mapping is not invented here — it is the one already established in
 * `docs/app-blueprint/93-design-mockup-audit.md`, which cross-references the
 * Claude Design project against what is actually mounted. This file just makes
 * that table executable so the audit can be re-run with pictures instead of
 * re-read from memory.
 *
 * Entries whose audit row says **unbuilt** or **superseded draft** are absent
 * on purpose: there is nothing to photograph, and a screenshot of a redirect
 * would be reported as a finding rather than as the known non-gap it is. The
 * report lists them from the audit doc instead.
 */

export type Role = 'admin' | 'teacher' | 'student' | 'anon';

export type Viewport = 'desktop' | 'mobile';

export const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export interface Capture {
  /** Output basename. Stable — the report links to it. */
  id: string;
  /** The Claude Design artboard this shot is evidence for. */
  mockup: string;
  role: Role;
  viewport: Viewport;
  /**
   * Where to go. A static path, or `{ from, hrefPattern }` to open the first
   * row of a list — detail routes take a UUID that differs per seeded DB, and
   * hardcoding one is how a capture suite rots the first time the seed changes.
   */
  target: string | { from: string; hrefPattern: string };
  /** Optional selector to wait for before the shot; failure is not fatal. */
  waitFor?: string;
}

export const CAPTURES: Capture[] = [
  // ── Marketing & auth ────────────────────────────────────────────────────
  {
    id: 'landing-desktop',
    mockup: 'Strummy - Landing Page Desktop.html',
    role: 'anon',
    viewport: 'desktop',
    target: '/',
  },
  {
    id: 'landing-mobile',
    mockup: 'Strummy - Landing Page Mobile.html',
    role: 'anon',
    viewport: 'mobile',
    target: '/',
  },
  {
    id: 'signin-desktop',
    mockup: 'Strummy - Auth Sign In.html',
    role: 'anon',
    viewport: 'desktop',
    target: '/sign-in',
    waitFor: '[data-testid="signin-email"]',
  },
  {
    id: 'signin-mobile',
    mockup: 'Strummy - Auth Sign In.html',
    role: 'anon',
    viewport: 'mobile',
    target: '/sign-in',
    waitFor: '[data-testid="signin-email"]',
  },

  // ── Dashboards ──────────────────────────────────────────────────────────
  {
    id: 'dashboard-teacher-desktop',
    mockup: 'Strummy - Teacher Dashboard.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard',
  },
  {
    id: 'dashboard-teacher-mobile',
    mockup: 'Strummy - Teacher Dashboard Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: '/dashboard',
  },
  {
    id: 'dashboard-student-desktop',
    mockup: 'Strummy - Student Dashboard.html',
    role: 'student',
    viewport: 'desktop',
    target: '/dashboard',
  },
  {
    id: 'dashboard-student-mobile',
    mockup: 'Strummy - Student Dashboard Mobile.html',
    role: 'student',
    viewport: 'mobile',
    target: '/dashboard',
  },
  {
    id: 'dashboard-admin-desktop',
    mockup: 'Strummy - Admin Dashboard.html',
    role: 'admin',
    viewport: 'desktop',
    target: '/dashboard',
  },
  {
    id: 'dashboard-admin-mobile',
    mockup: 'Strummy - Admin Dashboard Mobile.html',
    role: 'admin',
    viewport: 'mobile',
    target: '/dashboard',
  },

  // ── Lessons ─────────────────────────────────────────────────────────────
  {
    id: 'lessons-list-teacher-desktop',
    mockup: 'Strummy - Lesson List.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/lessons',
  },
  {
    id: 'lessons-list-teacher-mobile',
    mockup: 'Strummy - Lesson List Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: '/dashboard/lessons',
  },
  {
    id: 'lessons-list-student-desktop',
    mockup: 'Strummy - Lesson List Student.html',
    role: 'student',
    viewport: 'desktop',
    target: '/dashboard/lessons',
  },
  {
    id: 'lesson-detail-teacher-desktop',
    mockup: 'Strummy - Lesson Detail.html',
    role: 'teacher',
    viewport: 'desktop',
    target: { from: '/dashboard/lessons', hrefPattern: '/dashboard/lessons/' },
  },
  {
    id: 'lesson-detail-teacher-mobile',
    mockup: 'Strummy - Lesson Detail Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: { from: '/dashboard/lessons', hrefPattern: '/dashboard/lessons/' },
  },
  {
    id: 'lesson-form-teacher-desktop',
    mockup: 'Strummy - Lesson Form (Standalone).html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/lessons/new',
  },

  // ── Songs & skills ──────────────────────────────────────────────────────
  {
    id: 'song-detail-teacher-desktop',
    mockup: 'Strummy - Song Detail.html',
    role: 'teacher',
    viewport: 'desktop',
    target: { from: '/dashboard/songs', hrefPattern: '/dashboard/songs/' },
  },
  {
    id: 'song-form-teacher-desktop',
    mockup: 'Strummy - Song Form A.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/songs/new',
  },
  {
    id: 'song-form-teacher-mobile',
    mockup: 'Strummy - Song Form Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: '/dashboard/songs/new',
  },
  {
    id: 'fretboard-teacher-desktop',
    mockup: 'Strummy - Fretboard Explorer.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/fretboard',
  },
  {
    id: 'fretboard-teacher-mobile',
    mockup: 'Strummy - Fretboard Explorer Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: '/dashboard/fretboard',
  },
  {
    id: 'chord-quiz-student-desktop',
    mockup: 'Chord Quiz Design.html',
    role: 'student',
    viewport: 'desktop',
    target: '/dashboard/skills/chord-quiz',
  },
  {
    id: 'chord-quiz-student-mobile',
    mockup: 'Chord Quiz Design.html',
    role: 'student',
    viewport: 'mobile',
    target: '/dashboard/skills/chord-quiz',
  },

  // ── Assignments & notifications ─────────────────────────────────────────
  {
    id: 'assignments-teacher-desktop',
    mockup: 'Strummy - Assignments Teacher.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/assignments',
  },
  {
    id: 'assignments-student-desktop',
    mockup: 'Strummy - Assignments Student.html',
    role: 'student',
    viewport: 'desktop',
    target: '/dashboard/assignments',
  },
  {
    id: 'assignment-form-teacher-desktop',
    mockup: 'Strummy - Assignment Form (Standalone).html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/assignments/new',
  },
  {
    id: 'notifications-teacher-desktop',
    mockup: 'Strummy - Notifications.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/notifications',
  },
  {
    id: 'notifications-teacher-mobile',
    mockup: 'Strummy - Notifications Mobile.html',
    role: 'teacher',
    viewport: 'mobile',
    target: '/dashboard/notifications',
  },

  // ── Settings & users ────────────────────────────────────────────────────
  {
    id: 'settings-teacher-desktop',
    mockup: 'Strummy - Settings.html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/settings',
  },
  {
    id: 'student-detail-teacher-desktop',
    mockup: 'Strummy - Student Detail -Healthy-.html',
    role: 'teacher',
    viewport: 'desktop',
    target: { from: '/dashboard/users', hrefPattern: '/dashboard/users/' },
  },
  {
    id: 'student-form-teacher-desktop',
    mockup: 'Strummy - Student Form (Standalone).html',
    role: 'teacher',
    viewport: 'desktop',
    target: '/dashboard/users/new',
  },

  // ── Onboarding ──────────────────────────────────────────────────────────
  // Best-effort: the seeded accounts have already completed onboarding, so
  // this may legitimately redirect. A redirect is recorded, not failed —
  // "the wizard is unreachable for an onboarded user" is the correct answer.
  {
    id: 'onboarding-student-desktop',
    mockup: 'Strummy - Onboarding Student.html',
    role: 'student',
    viewport: 'desktop',
    target: '/onboarding',
  },
];
