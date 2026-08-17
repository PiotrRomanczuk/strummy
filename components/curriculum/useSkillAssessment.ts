'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { upsertStudentSkill } from '@/app/actions/student-skills';
import type { StudentSkill } from '@/app/actions/student-skills';
import type { SkillStatus } from '@/types/StudentSkills';

/**
 * The checklist's write path: one in-flight flag, one error slot, one refresh.
 *
 * `isUpdating` is deliberately global to the checklist rather than per row —
 * it matches the existing behaviour and the row count is small. If a future
 * per-row control makes the whole-list freeze feel wrong, the fix is per-row
 * pending state here, not a rewrite of the components.
 */
export const useSkillAssessment = (studentId: string, studentSkills: StudentSkill[]) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (skillId: string, status: SkillStatus, notes?: string) => {
    setIsUpdating(true);
    setError(null);
    const res = await upsertStudentSkill(studentId, skillId, status, notes);
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

  /**
   * Saving a note re-sends the skill's CURRENT status: the action takes
   * `status` as a required argument, so a note cannot exist without an
   * assessment. Resolving it here keeps that coupling in one place. The row
   * only offers the editor for an assessed skill, so the lookup succeeds — it
   * bails rather than inventing a status if that ever stops being true.
   */
  const saveNote = (skillId: string, notes: string) => {
    const current = studentSkills.find((ss) => ss.skill_id === skillId);
    if (!current) return;
    void save(skillId, current.status as SkillStatus, notes);
  };

  return {
    isUpdating,
    error,
    updateStatus: (skillId: string, status: SkillStatus) => save(skillId, status),
    saveNote,
  };
};
