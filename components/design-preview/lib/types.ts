export type Health = 'excellent' | 'good' | 'needs_attention' | 'at_risk' | 'critical';

export type SongStatusKey = 'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered';

export type Student = {
  id: string;
  name: string;
  level: string;
  years: number;
  avatar: string;
  color: string;
  health: Health;
  nextLesson: string;
  lastLesson: string;
  progress: number;
  streak: number;
  songs: number;
  mastered: number;
  note: string;
};

export type AgendaSong = {
  title: string;
  author: string;
  status: SongStatusKey;
  key: string;
};

export type AgendaLesson = {
  id: string;
  time: string;
  duration: string;
  endTime: string;
  student: Student;
  status: 'upcoming' | 'now' | 'done';
  songs: AgendaSong[];
  lastSummary: string;
};

export type WeekDay = {
  d: string;
  n: number;
  lessons: number;
  isToday: boolean;
};

export type StudentSong = {
  title: string;
  author: string;
  status: SongStatusKey;
  key: string;
  capo: number;
  lastPracticed: string;
  myMins: number;
};

export type PracticeItem = {
  kind: 'song' | 'drill';
  title: string;
  sub: string;
  mins: number;
  done: boolean;
  key: string;
};

export type ActivityItem = {
  id: string;
  mins: number;
  label: string;
  obj: string;
  type: 'assignment' | 'mastered' | 'lesson' | 'note' | 'practice';
};

export type Achievement = {
  name: string;
  sub: string;
  when: string;
  unlocked: boolean;
  progress?: number;
  max?: number;
};

export type AtRiskRow = {
  name: string;
  teacher: string;
  avatar: string;
  color: string;
  reason: string;
  churn: number;
};

export type CohortRow = {
  cohort: string;
  count: number;
  healthy: number;
  atRisk: number;
  dormant: number;
};

export type ServiceRow = {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latency: string;
  uptime: string;
  note?: string;
};

export type AuditRow = {
  who: string;
  verb: string;
  obj: string;
  mins: number;
  role: 'admin' | 'teacher' | 'system';
};

export type PendingInvite = {
  email: string;
  role: 'student' | 'teacher' | 'admin';
  invitedBy: string;
  when: string;
};
