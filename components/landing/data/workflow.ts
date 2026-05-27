export type WorkflowDay = {
  label: string;
  description: string;
};

export const workflowDays: WorkflowDay[] = [
  {
    label: 'Monday',
    description:
      'Generate lesson plans for the week ahead using AI, then customize for each student.',
  },
  {
    label: 'Tuesday',
    description:
      'First lessons of the week. Document what you taught and mark progress on each song.',
  },
  {
    label: 'Wednesday',
    description:
      'Send practice schedules and tabs to students. Parents get a progress snapshot automatically.',
  },
  {
    label: 'Thursday',
    description: 'More lessons. Update notes and song progress. Strummy keeps everything in sync.',
  },
  {
    label: 'Friday',
    description:
      "Final lessons and notes. Next week's plans are already queued up and ready to go.",
  },
];
