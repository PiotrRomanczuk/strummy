'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { confirmLessonAttendance } from '@/app/actions/lesson-attendance';
import { Button } from '@/components/ui/button';
import type { AttendanceOutcome } from '@/schemas/LessonAttendanceSchema';

type Props = {
  lessonId: string;
  labels: { held: string; notHeld: string; failed: string };
};

/** The two answers for one past lesson. Refreshes the page data on success. */
export const AttendanceReviewActions = ({ lessonId, labels }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasFailed, setHasFailed] = useState(false);

  const answer = (outcome: AttendanceOutcome) => {
    setHasFailed(false);
    startTransition(async () => {
      const result = await confirmLessonAttendance(lessonId, outcome);
      if ('error' in result) {
        setHasFailed(true);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => answer('held')}
        data-testid="attendance-held"
      >
        {labels.held}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => answer('not_held')}
        data-testid="attendance-not-held"
      >
        {labels.notHeld}
      </Button>
      {hasFailed && (
        <span role="alert" className="text-xs text-destructive">
          {labels.failed}
        </span>
      )}
    </div>
  );
};
