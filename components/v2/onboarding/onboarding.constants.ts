import type { SkillLevel, StudentJourneyData, TeacherStudioData } from '@/types/onboarding';

export interface WizardStep {
  key: string;
  title: string;
  sub: string;
}

/** Student path: role → one combined "guitar journey" screen → done. */
export const STUDENT_STEPS: WizardStep[] = [
  { key: 'role', title: 'Your role', sub: 'Teacher or student' },
  { key: 'journey', title: 'Your guitar journey', sub: 'Level, goals & practice' },
  { key: 'done', title: 'Done', sub: 'See your first lesson plan' },
];

/** Teacher path mirrors the batch-02 mockup: role → studio setup → done. */
export const TEACHER_STEPS: WizardStep[] = [
  { key: 'role', title: 'Your role', sub: 'Teacher or student' },
  { key: 'about', title: 'About you', sub: 'Name, instrument, experience' },
  { key: 'studio', title: 'Your studio', sub: 'Name, location, branding' },
  { key: 'invite', title: 'Invite students', sub: 'Send email invites' },
  { key: 'schedule', title: 'Schedule first lesson', sub: 'Pick a time' },
  { key: 'done', title: 'Done', sub: "You're ready to teach" },
];

export interface LevelOption {
  key: SkillLevel;
  title: string;
  sub: string;
}

export const LEVEL_OPTIONS: LevelOption[] = [
  { key: 'beginner', title: 'New to guitar', sub: 'Open chords coming together' },
  { key: 'novice', title: 'A few months in', sub: 'C–G–D feel natural' },
  { key: 'intermediate', title: 'Confident', sub: 'Songs from memory · barre chords' },
  { key: 'advanced', title: 'Many years in', sub: 'Improvising · complex pieces' },
];

export const GOAL_OPTIONS: { key: string; label: string }[] = [
  { key: 'classics', label: 'Learn classic songs' },
  { key: 'fingerstyle', label: 'Fingerstyle / classical' },
  { key: 'songwriting', label: 'Write my own songs' },
  { key: 'theory', label: 'Understand theory' },
  { key: 'perform', label: 'Play live / open mic' },
  { key: 'jam', label: 'Jam with friends' },
  { key: 'record', label: 'Record my playing' },
  { key: 'speed', label: 'Get faster / cleaner' },
];

/**
 * What the player actually has to hand. Asked of both roles and written to
 * `user_preferences.instrument_preference`.
 *
 * `none` is a first-class answer, not an omission: a brand-new student who has
 * not bought a guitar yet is exactly the person a teacher most needs to know
 * about before lesson one, and offering the option beats leaving them to skip
 * the question or pick something untrue.
 */
export const GUITAR_OPTIONS: { key: string; label: string }[] = [
  { key: 'acoustic', label: 'Acoustic (steel-string)' },
  { key: 'classical', label: 'Classical (nylon)' },
  { key: 'electric', label: 'Electric' },
  { key: 'bass', label: 'Bass' },
  { key: 'ukulele', label: 'Ukulele' },
  { key: 'none', label: "I don't have one yet" },
];

/** Labels for keys stored in `instrument_preference`, for read-only surfaces. */
export const GUITAR_LABELS: Record<string, string> = Object.fromEntries(
  GUITAR_OPTIONS.map((o) => [o.key, o.label])
);

export const PRACTICE_TARGETS = [10, 15, 20, 30, 45, 60];
export const LESSON_LENGTHS = [30, 45, 60, 90];
export const TEACHES_OPTIONS = [
  'Acoustic',
  'Electric',
  'Classical',
  'Bass',
  'Ukulele',
  'Theory',
  'Songwriting',
];
export const TIMEZONE_OPTIONS = [
  'Pacific (UTC-7)',
  'Mountain (UTC-6)',
  'Central (UTC-5)',
  'Eastern (UTC-4)',
  'GMT (UTC+0)',
  'Central Europe (UTC+2)',
];

export const DEFAULT_STUDENT: StudentJourneyData = {
  skillLevel: 'beginner',
  goals: [],
  dailyGoalMinutes: 20,
  guitars: [],
};

export const DEFAULT_TEACHER: TeacherStudioData = {
  displayName: '',
  instrument: 'Guitar',
  yearsExperience: '',
  studioName: '',
  tagline: '',
  city: '',
  timezone: 'Pacific (UTC-7)',
  teaches: ['Acoustic'],
  defaultLessonMinutes: 45,
  inviteEmails: '',
  guitars: [],
};
