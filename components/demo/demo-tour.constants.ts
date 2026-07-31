/**
 * Guided-tour steps for demo accounts, per role.
 *
 * Selectors anchor on `data-nav-item="<label>"`, which SidebarNavItem already
 * renders for every nav link — no extra markup in the nav tree. Steps whose
 * target is absent at runtime (mobile, hidden groups) are filtered out by
 * DemoTour before the tour starts.
 */

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';

export type TourRole = 'teacher' | 'student';

export interface TourStep {
  selector: string;
  title: string;
  description: string;
}

const TEACHER_STEPS: TourStep[] = [
  {
    selector: 'main',
    title: 'Welcome to Strummy',
    description:
      "This is Sarah's studio — a real, working dataset. Today's schedule, student progress, and overdue homework all live here. Feel free to click anything; the demo resets periodically.",
  },
  {
    selector: '[data-nav-item="Lessons"]',
    title: 'Lessons',
    description:
      'Every lesson, past and upcoming, grouped by date — with per-student running lesson numbers and the songs covered in each session.',
  },
  {
    selector: '[data-nav-item="Songs"]',
    title: 'Song library',
    description:
      'The studio catalog: difficulty, keys, chord diagrams, and Spotify-enriched metadata. Songs attach to lessons and build each student’s repertoire.',
  },
  {
    selector: '[data-nav-item="Assignments"]',
    title: 'Assignments',
    description:
      'Homework with due dates and checklists. Overdue work surfaces first, and students tick items off from their own view.',
  },
  {
    selector: '[data-nav-item="Students"]',
    title: 'Students',
    description:
      'The roster. Open a student to see their repertoire, practice minutes against goal, and full lesson history — the "what were we doing last time?" answer.',
  },
  {
    selector: '[data-nav-item="AI Assistant"]',
    title: 'AI tools',
    description:
      'Ten domain agents: lesson notes, personalized assignments, progress insights, and more — with graceful fallbacks when AI is unavailable.',
  },
];

const STUDENT_STEPS: TourStep[] = [
  {
    selector: 'main',
    title: "Welcome — this is Emma's view",
    description:
      'Students see their own world: songs in progress, upcoming lessons, and homework. Everything a teacher schedules lands here.',
  },
  {
    selector: '[data-nav-item="My Lessons"]',
    title: 'My lessons',
    description: 'Lesson history and what each session covered — songs, notes, and progress.',
  },
  {
    selector: '[data-nav-item="My Assignments"]',
    title: 'My assignments',
    description: 'Homework with checklists to tick off — progress syncs back to the teacher.',
  },
  // Practice Log step lives behind the same flag as its nav item. DemoTour
  // would drop it anyway once the selector stops resolving, but leaving a step
  // that only survives by accident is how a tour silently ends one step short.
  ...(SHOW_PRACTICE_FEATURES
    ? [
        {
          selector: '[data-nav-item="Practice Log"]',
          title: 'Practice log',
          description: 'Minutes practiced against the weekly goal, charted over time.',
        },
      ]
    : []),
];

export function getTourSteps(role: TourRole): TourStep[] {
  return role === 'teacher' ? TEACHER_STEPS : STUDENT_STEPS;
}

export function tourStorageKey(role: TourRole): string {
  return `strummy-demo-tour-v1-${role}`;
}
