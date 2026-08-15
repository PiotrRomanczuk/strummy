'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { upsertStudentSkill } from '@/app/actions/student-skills';
import type { SkillStatus } from '@/types/StudentSkills';

/**
 * The checklist's write path: one in-flight flag, one error slot, one refresh.
 *
 * `isUpdating` is deliberately global to the checklist rather than per row —
 * it matches the existing behaviour and the row count is small. If a future
 * per-row control makes the whole-list freeze feel wrong, the fix is per-row
 * pending state here, not a rewrite of the components.
 */
export const useSkillAssessment = (studentId: string) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (skillId: string, status: SkillStatus) => {
    setIsUpdating(true);
    setError(null);
    const res = await upsertStudentSkill(studentId, skillId, status);
    if (res.error) {
      setError(res.error);
    } else {
      // `revalidatePath()` inside the action invalidates the server cache but
      // does not re-render an already-mounted client component — `studentSkills`
      // is a static prop from the initial load, not a live query. Without this,
      // an assessment saves to the DB and never appears until a manual reload.
      router.refresh();
    }
    setIsUpdating(false);
  };

  return { isUpdating, error, updateStatus };
};
