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

// Timeline copy (the prose) lives in messages/*.json under Landing.dayInTheLife
// (before0..4 / after0..4) — only the times are structural/non-translatable.
export const DAY_BEFORE_TIMES = ['7:45a', '11:20a', '2:10p', '4:00p', '9:30p'];
export const DAY_AFTER_TIMES = ['7:45a', '11:20a', '2:10p', '4:00p', '9:30p'];
