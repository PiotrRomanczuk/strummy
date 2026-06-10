import type {
  Achievement,
  ActivityItem,
  AgendaLesson,
  AtRiskRow,
  AuditRow,
  CohortRow,
  PendingInvite,
  PracticeItem,
  ServiceRow,
  Student,
  StudentSong,
  WeekDay,
} from './types';

export const TODAY = { day: 'Thursday', date: 'April 23', year: 2026, weekNum: 17 };

export const STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Emma Johnson',
    level: 'Intermediate',
    years: 2.3,
    avatar: 'EJ',
    color: '#c89523',
    health: 'excellent',
    nextLesson: 'Today · 4:00p',
    lastLesson: 'Apr 16',
    progress: 62,
    streak: 11,
    songs: 14,
    mastered: 5,
    note: 'Working on fingerpicking "Blackbird" — right-hand independence improving.',
  },
  {
    id: 's2',
    name: 'Carlos Reyes',
    level: 'Beginner',
    years: 0.6,
    avatar: 'CR',
    color: '#b84a3a',
    health: 'at_risk',
    nextLesson: 'Today · 5:00p',
    lastLesson: 'Apr 9',
    progress: 28,
    streak: 0,
    songs: 6,
    mastered: 1,
    note: 'Missed last two sessions. Bring back basics — open chords + strumming.',
  },
  {
    id: 's3',
    name: 'Lily Park',
    level: 'Beginner',
    years: 1.1,
    avatar: 'LP',
    color: '#3a7d3a',
    health: 'good',
    nextLesson: 'Today · 6:30p',
    lastLesson: 'Apr 17',
    progress: 45,
    streak: 5,
    songs: 9,
    mastered: 2,
    note: 'Ready to introduce barre chords. Start with F major shape.',
  },
  {
    id: 's4',
    name: 'James O’Brien',
    level: 'Beginner',
    years: 0.4,
    avatar: 'JO',
    color: '#3a5a7d',
    health: 'needs_attention',
    nextLesson: 'Fri Apr 24',
    lastLesson: 'Apr 15',
    progress: 18,
    streak: 2,
    songs: 4,
    mastered: 0,
    note: 'Practice log shows 45 min total last week. Nudge on habit.',
  },
  {
    id: 's5',
    name: 'Maya Patel',
    level: 'Advanced',
    years: 4.8,
    avatar: 'MP',
    color: '#6d4fa0',
    health: 'excellent',
    nextLesson: 'Sat Apr 25',
    lastLesson: 'Apr 18',
    progress: 88,
    streak: 24,
    songs: 32,
    mastered: 19,
    note: 'Prepping "Classical Gas". Needs metronome work at 140 BPM.',
  },
  {
    id: 's6',
    name: 'Theo Nakamura',
    level: 'Intermediate',
    years: 1.9,
    avatar: 'TN',
    color: '#c17a3a',
    health: 'good',
    nextLesson: 'Mon Apr 28',
    lastLesson: 'Apr 14',
    progress: 54,
    streak: 8,
    songs: 11,
    mastered: 4,
    note: 'Wants to learn "Wish You Were Here" solo. Bring tab + backing track.',
  },
];

export const AGENDA: AgendaLesson[] = [
  {
    id: 'l1',
    time: '4:00p',
    duration: '45m',
    endTime: '4:45p',
    student: STUDENTS[0],
    status: 'upcoming',
    songs: [
      { title: 'Blackbird', author: 'The Beatles', status: 'started', key: 'G' },
      { title: 'Landslide', author: 'Fleetwood Mac', status: 'remembered', key: 'C' },
    ],
    lastSummary: 'Covered alternating bass pattern. Homework: 10 min/day fingerpicking drill.',
  },
  {
    id: 'l2',
    time: '5:00p',
    duration: '30m',
    endTime: '5:30p',
    student: STUDENTS[1],
    status: 'upcoming',
    songs: [{ title: 'Wonderwall', author: 'Oasis', status: 'to_learn', key: 'Em' }],
    lastSummary: 'Re-introduce D–Cadd9–G progression. Check capo position.',
  },
  {
    id: 'l3',
    time: '6:30p',
    duration: '45m',
    endTime: '7:15p',
    student: STUDENTS[2],
    status: 'upcoming',
    songs: [
      { title: 'House of the Rising Sun', author: 'Trad.', status: 'started', key: 'Am' },
      { title: 'F major barre drill', author: 'Technique', status: 'to_learn', key: 'F' },
    ],
    lastSummary: 'Am–C–D–F arpeggio pattern solid at 60 BPM. Push to 80.',
  },
];

export const NEEDS_ATTN = [
  { student: STUDENTS[1], reason: 'No practice logged in 11 days', severity: 'at_risk' as const },
  {
    student: STUDENTS[3],
    reason: 'Assignment overdue 3 days',
    severity: 'needs_attention' as const,
  },
  {
    student: STUDENTS[3],
    reason: 'Missed last scheduled lesson',
    severity: 'needs_attention' as const,
  },
];

export const WEEK_DAYS: WeekDay[] = [
  { d: 'M', n: 20, lessons: 2, isToday: false },
  { d: 'T', n: 21, lessons: 3, isToday: false },
  { d: 'W', n: 22, lessons: 1, isToday: false },
  { d: 'T', n: 23, lessons: 3, isToday: true },
  { d: 'F', n: 24, lessons: 2, isToday: false },
  { d: 'S', n: 25, lessons: 1, isToday: false },
  { d: 'S', n: 26, lessons: 0, isToday: false },
];

export const ME_STUDENT = {
  id: 'me',
  name: 'Liam Chen',
  avatar: 'LC',
  color: '#3a7d3a',
  level: 'Intermediate · Year 2',
  streak: 11,
  practiceMinToday: 14,
  practiceGoal: 30,
  practiceWeek: [22, 35, 0, 28, 41, 12, 14],
  achievements: 3,
  totalSongs: 14,
  mastered: 5,
};

export const STUDENT_NEXT_LESSON = {
  with: 'Sarah Chen',
  withAvatar: 'SC',
  withColor: '#c89523',
  when: 'Today',
  time: '4:00p',
  inMinutes: 134,
  duration: '45m',
  location: 'Studio A — Mission St',
  agenda: [
    { title: 'Blackbird', sub: 'fingerpicking pattern + bridge', key: 'G' },
    { title: 'Landslide', sub: 'verse review', key: 'C' },
    { title: 'Open chord drill', sub: '10 min warm-up', key: '—' },
  ],
};

export const STUDENT_LAST_LESSON = {
  when: 'Last Thursday · Apr 16',
  duration: '45m',
  recap:
    'Alternating bass pattern clicked in measure 2–4. Right-hand independence is the next unlock — 10 min/day fingerpicking drill, slow.',
  homework: [
    { task: 'Blackbird — measures 1–8 at 60 BPM', done: true },
    { task: '10 min/day fingerpicking drill', done: false, progress: 5 },
    { task: 'Listen to live version (Anthology)', done: true },
  ],
};

export const STUDENT_SONGS: StudentSong[] = [
  {
    title: 'Blackbird',
    author: 'The Beatles',
    status: 'started',
    key: 'G',
    capo: 0,
    lastPracticed: '1d ago',
    myMins: 42,
  },
  {
    title: 'Landslide',
    author: 'Fleetwood Mac',
    status: 'remembered',
    key: 'C',
    capo: 3,
    lastPracticed: '2d ago',
    myMins: 96,
  },
  {
    title: 'Tears in Heaven',
    author: 'Eric Clapton',
    status: 'with_author',
    key: 'A',
    capo: 0,
    lastPracticed: 'today',
    myMins: 118,
  },
  {
    title: 'Wonderwall',
    author: 'Oasis',
    status: 'mastered',
    key: 'Em',
    capo: 2,
    lastPracticed: '3d ago',
    myMins: 230,
  },
  {
    title: 'House of the R.S.',
    author: 'Trad.',
    status: 'started',
    key: 'Am',
    capo: 0,
    lastPracticed: '5d ago',
    myMins: 18,
  },
  {
    title: 'Hotel California',
    author: 'Eagles',
    status: 'to_learn',
    key: 'Bm',
    capo: 7,
    lastPracticed: '—',
    myMins: 0,
  },
];

export const STUDENT_PRACTICE_TODAY: PracticeItem[] = [
  { kind: 'song', title: 'Blackbird', sub: 'measures 1–8, slow', mins: 10, done: false, key: 'G' },
  {
    kind: 'drill',
    title: 'Fingerpicking drill',
    sub: 'PIMA pattern · metronome 60',
    mins: 10,
    done: false,
    key: '—',
  },
  { kind: 'song', title: 'Landslide', sub: 'verse + chorus run', mins: 10, done: false, key: 'C' },
];

export const STUDENT_ACTIVITY: ActivityItem[] = [
  {
    id: 'sa1',
    mins: 22,
    label: 'Sarah assigned',
    obj: '"Tears in Heaven" — verse',
    type: 'assignment',
  },
  { id: 'sa2', mins: 80, label: 'You mastered', obj: '"Wonderwall"', type: 'mastered' },
  { id: 'sa3', mins: 240, label: 'Lesson rescheduled', obj: 'Thu 4:00p → 4:30p', type: 'lesson' },
  {
    id: 'sa4',
    mins: 380,
    label: 'Sarah added note',
    obj: '"Try the slower live version"',
    type: 'note',
  },
  { id: 'sa5', mins: 1320, label: 'You logged', obj: '35 min practice', type: 'practice' },
];

export const STUDENT_ACHIEVEMENTS: Achievement[] = [
  { name: 'First song mastered', sub: 'Wonderwall', when: 'Apr 8', unlocked: true },
  { name: 'Two-week streak', sub: '14 days in a row', when: 'Apr 14', unlocked: true },
  { name: 'Barre breakthrough', sub: 'First clean F major', when: 'Apr 19', unlocked: true },
  {
    name: '30-min club',
    sub: '10 sessions ≥ 30m',
    when: '—',
    unlocked: false,
    progress: 7,
    max: 10,
  },
];

export const ADMIN_PLATFORM = {
  health: 'healthy',
  activeUsers30d: 1284,
  activeUsersDelta: '+8.2%',
  lessonsThisWeek: 412,
  lessonsThisWeekDelta: '+12%',
  newSignups7d: 38,
  newSignupsDelta: '+4',
  mrr: 18420,
  mrrDelta: '+$640',
  retention28d: 87.4,
  retentionDelta: '+1.1pp',
};

export const ADMIN_SERVICES: ServiceRow[] = [
  { name: 'Supabase', status: 'ok', latency: '42ms', uptime: '99.99%' },
  { name: 'OpenRouter', status: 'ok', latency: '320ms', uptime: '99.92%' },
  {
    name: 'Spotify',
    status: 'degraded',
    latency: '1.2s',
    uptime: '99.45%',
    note: 'Elevated latency · last 30m',
  },
  { name: 'Resend', status: 'ok', latency: '180ms', uptime: '99.98%' },
  { name: 'Stripe', status: 'ok', latency: '95ms', uptime: '99.99%' },
  { name: 'Sentry', status: 'ok', latency: '—', uptime: '99.95%' },
];

export const ADMIN_AT_RISK: AtRiskRow[] = [
  {
    name: 'Carlos Reyes',
    teacher: 'Sarah Chen',
    avatar: 'CR',
    color: '#b84a3a',
    reason: '0 practice · 11 days',
    churn: 78,
  },
  {
    name: 'James O’Brien',
    teacher: 'Sarah Chen',
    avatar: 'JO',
    color: '#3a5a7d',
    reason: 'Assignment overdue 3d',
    churn: 54,
  },
  {
    name: 'Priya Sharma',
    teacher: 'Marcus Webb',
    avatar: 'PS',
    color: '#6d4fa0',
    reason: 'Missed last 2 lessons',
    churn: 49,
  },
  {
    name: 'Daniel Cho',
    teacher: 'Marcus Webb',
    avatar: 'DC',
    color: '#c17a3a',
    reason: 'Cancelled subscription',
    churn: 92,
  },
  {
    name: 'Aisha Bah',
    teacher: 'Elena Ruiz',
    avatar: 'AB',
    color: '#3a7d3a',
    reason: 'Login frequency ↓ 60%',
    churn: 41,
  },
];

export const ADMIN_COHORT_INSIGHTS: CohortRow[] = [
  { cohort: 'New beginners (0–3mo)', count: 142, healthy: 108, atRisk: 21, dormant: 13 },
  { cohort: 'Active (3–12mo)', count: 384, healthy: 312, atRisk: 48, dormant: 24 },
  { cohort: 'Long-term (1y+)', count: 218, healthy: 188, atRisk: 22, dormant: 8 },
];

export const ADMIN_AUDIT: AuditRow[] = [
  {
    who: 'sarah.chen@strummy.app',
    verb: 'reset password for',
    obj: 'carlos.reyes@…',
    mins: 8,
    role: 'teacher',
  },
  { who: 'admin@strummy.app', verb: 'invited', obj: 'priya.s@gmail.com', mins: 42, role: 'admin' },
  {
    who: 'system',
    verb: 'auto-suspended',
    obj: 'spotify integration · degraded',
    mins: 90,
    role: 'system',
  },
  {
    who: 'marcus.w@strummy.app',
    verb: 'archived student',
    obj: 'Tom Reeves (inactive 90d)',
    mins: 240,
    role: 'teacher',
  },
  {
    who: 'admin@strummy.app',
    verb: 'sent broadcast',
    obj: 'Holiday recital reminder · 412 users',
    mins: 480,
    role: 'admin',
  },
];

export const ADMIN_PENDING: PendingInvite[] = [
  { email: 'priya.s@gmail.com', role: 'student', invitedBy: 'admin', when: '2h ago' },
  { email: 'aaron.k@strummy.app', role: 'teacher', invitedBy: 'admin', when: '1d ago' },
  { email: 'lena.h@gmail.com', role: 'student', invitedBy: 'sarah.chen', when: '2d ago' },
];
