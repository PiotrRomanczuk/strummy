import {
  Users,
  Music,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Guitar,
  BarChart,
  FileText,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Sparkles,
  ListMusic,
  Bell,
  Zap,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

import { SHOW_AI_FEATURES, SHOW_PRACTICE_FEATURES } from '@/lib/config/features';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface NotificationItem extends MenuItem {
  hasIndicator: boolean;
}

export const HOME_ITEM: MenuItem = {
  id: 'home',
  label: 'Home',
  icon: LayoutDashboard,
  path: '/dashboard',
};

export const NOTIFICATION_ITEM: NotificationItem = {
  id: 'notifications',
  label: 'Notifications',
  icon: Bell,
  path: '/dashboard/notifications',
  hasIndicator: true,
};

// Hide features from the sidebar until each is individually proven. Hiding is
// nav-only — routes stay reachable by direct URL. Remove an id here once the
// feature is backed by real data and has been clicked through end to end.
//
// Revealed 2026-07-19 after verification: fretboard (self-contained, no data
// needed), ai + ai-chat (OpenRouter key verified live, gated on
// SHOW_AI_FEATURES so nav and the in-form generators toggle in lockstep),
// repertoire and practice (both seeded with real history). Calendar stayed
// visible throughout. Still hidden below: surfaces that are either
// "Coming soon" stubs or would render empty.
const CORE_LOOP_HIDDEN_ITEMS = [
  // Built, but no seeded course content yet
  'theory',
  // 'skills' revealed 2026-07-22 (CHT-2): real hub over the chord quiz, which is
  // now teacher-directable via assignable chord drills (ASG-4).
  // "Coming soon" stub pages
  'health',
  'song-stats',
  'lesson-stats',
  'chord-analysis',
  'cohorts',
  'my-stats',
  // Admin-flavoured; not part of the teaching loop
  'logs',
  'import-logs',
];

// AI surfaces are gated on the master switch, not the static list above, so the
// sidebar items and the in-form generators toggle in lockstep.
const AI_ITEMS = ['ai', 'ai-chat'];

// Practice is gated the same way, for the same reason: the sidebar entry and
// every practice read-out across the student, teacher and parent dashboards
// toggle together off SHOW_PRACTICE_FEATURES.
const PRACTICE_ITEMS = ['practice'];

function hideNonCore(groups: MenuGroup[]): MenuGroup[] {
  const hidden = [
    ...CORE_LOOP_HIDDEN_ITEMS,
    ...(SHOW_AI_FEATURES ? [] : AI_ITEMS),
    ...(SHOW_PRACTICE_FEATURES ? [] : PRACTICE_ITEMS),
  ];
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !hidden.includes(item.id)),
    }))
    .filter((g) => g.items.length > 0);
}

function getTeacherGroups(): MenuGroup[] {
  const groups: MenuGroup[] = [
    {
      label: 'Teaching',
      items: [
        { id: 'lessons', label: 'Lessons', icon: BookOpen, path: '/dashboard/lessons' },
        { id: 'songs', label: 'Songs', icon: Music, path: '/dashboard/songs' },
        {
          id: 'assignments',
          label: 'Assignments',
          icon: ClipboardList,
          path: '/dashboard/assignments',
        },
        { id: 'theory', label: 'Theory', icon: GraduationCap, path: '/dashboard/theory' },
      ],
    },
    {
      label: 'Students',
      items: [
        // Labelled "People" to match the page it opens: `/dashboard/users` is a
        // role-filtered people list (its heading, empty state and search copy all
        // say "people"), and the enclosing group is already "Students" — so the
        // old label both contradicted the destination and repeated its group.
        { id: 'students', label: 'People', icon: Users, path: '/dashboard/users' },
        { id: 'health', label: 'Health Monitor', icon: HeartPulse, path: '/dashboard/health' },
      ],
    },
    {
      label: 'Analytics',
      items: [
        {
          id: 'song-stats',
          label: 'Song Stats',
          icon: BarChart,
          path: '/dashboard/admin/stats/songs',
        },
        {
          id: 'lesson-stats',
          label: 'Lesson Stats',
          icon: BarChart,
          path: '/dashboard/admin/stats/lessons',
        },
        {
          id: 'chord-analysis',
          label: 'Chord Analysis',
          icon: ListMusic,
          path: '/dashboard/admin/stats/chord-analysis',
        },
        { id: 'cohorts', label: 'Cohorts', icon: Users, path: '/dashboard/cohorts' },
        { id: 'logs', label: 'Logs', icon: FileText, path: '/dashboard/logs' },
        {
          id: 'import-logs',
          label: 'Import Logs',
          icon: FileText,
          path: '/dashboard/admin/import-logs',
        },
      ],
    },
    {
      label: 'Tools',
      items: [
        { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/dashboard/calendar' },
        { id: 'fretboard', label: 'Fretboard', icon: Guitar, path: '/dashboard/fretboard' },
        // Moved out of "Students" 2026-08-15 (SKL-2): this route is the chord-quiz
        // hub (doc 05), not the per-student skill assessment its old group implied.
        // The assessment lives on the student detail page's Skills tab.
        { id: 'practice-tools', label: 'Practice Tools', icon: Zap, path: '/dashboard/skills' },
        { id: 'ai', label: 'AI Assistant', icon: Sparkles, path: '/dashboard/ai' },
        { id: 'ai-chat', label: 'AI Chat', icon: MessageSquare, path: '/dashboard/ai/chat' },
      ],
    },
  ];

  return groups;
}

function getStudentGroups(): MenuGroup[] {
  return [
    {
      label: 'Learning',
      items: [
        { id: 'my-lessons', label: 'My Lessons', icon: BookOpen, path: '/dashboard/lessons' },
        {
          id: 'my-assignments',
          label: 'My Assignments',
          icon: ClipboardList,
          path: '/dashboard/assignments',
        },
        {
          id: 'repertoire',
          label: 'My Repertoire',
          icon: ListMusic,
          path: '/dashboard/repertoire',
        },
        // SKL-1, 2026-08-15. Sits in Learning, not Progress: Progress is emptied
        // entirely by hideNonCore (`my-stats` hidden, `practice` flagged off), so
        // adding it there would resurrect a one-item group promising statistics
        // that do not exist. Learning already holds the student's other
        // teacher-owned artifacts, which is exactly what an assessment is.
        { id: 'my-skills', label: 'My Skills', icon: Zap, path: '/dashboard/my-skills' },
      ],
    },
    {
      label: 'Resources',
      items: [
        // SNG-6: this route is the whole studio library, not the student's own
        // songs — those live under "My Repertoire" (grouped under Learning,
        // above, alongside the other personal/student-scoped items). Song
        // Library and Theory are shared, teacher-curated content rather than
        // per-student data, so they get their own group instead of sitting
        // next to My Lessons/My Assignments/My Repertoire.
        { id: 'my-songs', label: 'Song Library', icon: Music, path: '/dashboard/songs' },
        // Revealed to students 2026-08-01, by the same "clicked through end to
        // end" bar the teacher nav uses. Both routes already worked for a
        // student and are sold on the landing page, but neither was reachable
        // from the student sidebar — only by guessing the URL. Self-contained:
        // the fretboard needs no data at all, and the quiz builds its own
        // session, so neither can render empty.
        { id: 'fretboard', label: 'Fretboard', icon: Guitar, path: '/dashboard/fretboard' },
        // id renamed from 'skills' 2026-08-15 (SKL-2). The sidebar renders
        // `t(id)` from the Nav namespace, NOT `label` — `label` only reaches the
        // `data-nav-item` attribute. While this shared the teacher entry's
        // 'skills' id, a student saw `Nav.skills` = "Skills" here, never
        // "Practice Tools". A distinct id is what makes the label real.
        { id: 'practice-tools', label: 'Practice Tools', icon: Zap, path: '/dashboard/skills' },
        { id: 'theory', label: 'Theory', icon: GraduationCap, path: '/dashboard/theory' },
      ],
    },
    {
      label: 'Progress',
      items: [
        { id: 'my-stats', label: 'My Stats', icon: BarChart, path: '/dashboard/stats' },
        { id: 'practice', label: 'Practice Log', icon: Guitar, path: '/dashboard/practice' },
      ],
    },
  ];
}

interface RoleFlags {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent?: boolean;
  isDemoAccount?: boolean;
}

export function getMenuGroups({ isAdmin, isTeacher, isStudent, isParent }: RoleFlags): MenuGroup[] {
  if (isAdmin || isTeacher) return hideNonCore(getTeacherGroups());
  if (isStudent) return hideNonCore(getStudentGroups());
  // A parent's entire surface is the family dashboard (with `?child=` switching
  // between children), reached via the sidebar's standing Dashboard link. They
  // hold read-only RLS grants on their child's rows but no list page is
  // parent-scoped, so a Lessons or Songs entry would open an empty page —
  // exactly the placeholder navigation the core-loop trust pass forbids. This
  // branch is deliberate: it separates "parent, one real surface" from the
  // role-less fall-through below, which means onboarding never finished.
  if (isParent) return [];
  return [];
}
