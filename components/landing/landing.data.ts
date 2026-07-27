/**
 * Sample studio data rendered inside the landing page's mock product shots.
 * Fictional students (from the mockup design system) — never real user data.
 */

export type SampleStudent = {
  name: string;
  avatar: string;
  color: string;
  health: 'excellent' | 'good' | 'needs_attention' | 'at_risk';
};

export const SAMPLE_STUDENTS: SampleStudent[] = [
  { name: 'Emma Johnson', avatar: 'EJ', color: '#c89523', health: 'excellent' },
  { name: 'Carlos Reyes', avatar: 'CR', color: '#b84a3a', health: 'at_risk' },
  { name: 'Lily Park', avatar: 'LP', color: '#3a7d3a', health: 'good' },
  { name: "James O'Brien", avatar: 'JO', color: '#3a5a7d', health: 'needs_attention' },
  { name: 'Maya Patel', avatar: 'MP', color: '#6d4fa0', health: 'excellent' },
];

export const HEALTH_COLOR: Record<SampleStudent['health'], string> = {
  excellent: 'var(--success)',
  good: 'var(--gold-2)',
  needs_attention: 'var(--warn, #b8860b)',
  at_risk: 'var(--danger)',
};

export const HERO_AGENDA = [
  { time: '4:00p', dur: '45m', student: SAMPLE_STUDENTS[0], song: 'Blackbird', key: 'G' },
  { time: '5:00p', dur: '30m', student: SAMPLE_STUDENTS[1], song: 'Wonderwall', key: 'Em' },
  {
    time: '6:30p',
    dur: '45m',
    student: SAMPLE_STUDENTS[2],
    song: 'House of the Rising Sun',
    key: 'Am',
  },
];

export const DAY_BEFORE = [
  {
    time: '7:45a',
    text: 'Dig through 6 WhatsApp threads to remember what Emma worked on last week.',
  },
  { time: '11:20a', text: 'Email a parent a "progress update" you half-invent from memory.' },
  {
    time: '2:10p',
    text: 'Can\'t find the tab for "Blackbird" you promised Carlos three weeks ago.',
  },
  { time: '4:00p', text: 'Lesson starts. First ten minutes: catching up on your own notes.' },
  { time: '9:30p', text: "Tonight's admin: copy assignments into a spreadsheet. Again." },
];

export const DAY_AFTER = [
  {
    time: '7:45a',
    text: "Open Strummy. See everyone you're teaching today, what they worked on, what broke.",
  },
  { time: '11:20a', text: 'Progress report drafted from lesson notes. Send in one click.' },
  {
    time: '2:10p',
    text: '"Blackbird" is in the shared library, tabs attached, marked as started.',
  },
  { time: '4:00p', text: "Lesson starts. Last session's notes are already on screen." },
  { time: '9:30p', text: "You're done. Admin happened automatically during the day." },
];

export const HOW_STEPS = [
  {
    n: '01',
    title: 'Add students & lessons',
    body: 'Book lessons inside Strummy, or sync them straight from Google Calendar — both directions, automatically kept in step.',
    chip: 'Two-way Google Calendar sync',
  },
  {
    n: '02',
    title: 'Teach — Strummy remembers',
    body: "Mark what each student played and how it's landing. Their repertoire and progress status advance forward on their own, never sliding back by accident.",
    flow: ['to learn', 'started', 'remembered', 'mastered'],
  },
  {
    n: '03',
    title: 'Walk in ready',
    body: "Before the lesson starts, last session's notes, their song list, and what to work on next are already on the screen.",
    chip: 'AI-drafted lesson notes & recap',
  },
];
