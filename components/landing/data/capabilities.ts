import type { LucideIcon } from 'lucide-react';
import { ListMusic, NotebookPen, Share2 } from 'lucide-react';

export type Capability = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const capabilities: Capability[] = [
  {
    title: 'Students and songs',
    description:
      'Build a library of every song each student is learning, from first strum to mastery.',
    icon: ListMusic,
  },
  {
    title: 'Lessons and planning',
    description:
      "Plan lessons in minutes with AI assistance, then document what you taught and what's next.",
    icon: NotebookPen,
  },
  {
    title: 'Sharing with students and parents',
    description:
      'Send tabs, chords, and practice schedules between lessons. Parents see progress without asking.',
    icon: Share2,
  },
];
