'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';

import { saveOnboardingEditorial } from '@/app/actions/onboarding-editorial';
import type {
  OnboardingRole,
  StudentJourneyData,
  TeacherStudioData,
} from '@/types/onboarding-editorial';
import {
  DEFAULT_STUDENT,
  DEFAULT_TEACHER,
  STUDENT_STEPS,
  TEACHER_STEPS,
  type WizardStep,
} from './onboarding-editorial.constants';
import { canAdvanceFrom } from './onboarding-editorial.helpers';

const toggle = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export interface OnboardingWizard {
  role: OnboardingRole | null;
  step: number;
  steps: WizardStep[];
  student: StudentJourneyData;
  teacher: TeacherStudioData;
  canNext: boolean;
  isSaving: boolean;
  error: string;
  selectRole: (role: OnboardingRole) => void;
  setStudent: <K extends keyof StudentJourneyData>(key: K, value: StudentJourneyData[K]) => void;
  toggleGoal: (goal: string) => void;
  setTeacher: <K extends keyof TeacherStudioData>(key: K, value: TeacherStudioData[K]) => void;
  toggleTeaches: (item: string) => void;
  back: () => void;
  next: () => void;
}

/** Owns the editorial onboarding state machine and final persistence. */
export function useOnboardingEditorial(): OnboardingWizard {
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [step, setStep] = useState(0);
  const [student, setStudentState] = useState<StudentJourneyData>(DEFAULT_STUDENT);
  const [teacher, setTeacherState] = useState<TeacherStudioData>(DEFAULT_TEACHER);
  const [error, setError] = useState('');
  const [isSaving, startSaving] = useTransition();

  const steps = useMemo(() => (role === 'teacher' ? TEACHER_STEPS : STUDENT_STEPS), [role]);
  const currentKey = steps[step]?.key ?? 'role';
  const canNext = canAdvanceFrom(currentKey, role, student, teacher);

  const selectRole = useCallback((next: OnboardingRole) => {
    setRole(next);
    setError('');
  }, []);

  const setStudent = useCallback<OnboardingWizard['setStudent']>((key, value) => {
    setStudentState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleGoal = useCallback((goal: string) => {
    setStudentState((prev) => ({ ...prev, goals: toggle(prev.goals, goal) }));
  }, []);

  const setTeacher = useCallback<OnboardingWizard['setTeacher']>((key, value) => {
    setTeacherState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleTeaches = useCallback((item: string) => {
    setTeacherState((prev) => ({ ...prev, teaches: toggle(prev.teaches, item) }));
  }, []);

  const back = useCallback(() => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const persist = useCallback(() => {
    if (!role) return;
    startSaving(async () => {
      const res = await saveOnboardingEditorial({
        role,
        student: role === 'student' ? student : undefined,
        teacher: role === 'teacher' ? teacher : undefined,
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setStep((s) => Math.min(s + 1, steps.length - 1));
    });
  }, [role, student, teacher, steps.length]);

  const next = useCallback(() => {
    if (!canNext) return;
    setError('');
    const isBeforeDone = steps[step + 1]?.key === 'done';
    if (isBeforeDone) {
      persist();
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }, [canNext, persist, step, steps]);

  return {
    role,
    step,
    steps,
    student,
    teacher,
    canNext,
    isSaving,
    error,
    selectRole,
    setStudent,
    toggleGoal,
    setTeacher,
    toggleTeaches,
    back,
    next,
  };
}
