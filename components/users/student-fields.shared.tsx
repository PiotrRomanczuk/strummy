'use client';

import type { ReactNode } from 'react';

import type { BillingCycle, LessonDayNumber, SkillLevel } from '@/schemas/StudentIntakeSchema';

/** camelCase form model shared by the create + edit student forms. */
export type StudentFormValues = {
  fullName: string;
  instrument: string;
  skillLevel: SkillLevel;
  startDate: string;
  avatarColor: string;
  studentEmail: string;
  phone: string;
  parentName: string;
  parentEmail: string;
  /** ISO 8601 weekday, 1 = Monday … 7 = Sunday. */
  lessonDay: LessonDayNumber;
  /** 24h HH:MM from the time input; '' when unset. */
  lessonTime: string;
  lessonDuration: number;
  /** Kept as string for the controlled input; parsed to a number at submit. */
  lessonRate: string;
  billingCycle: BillingCycle;
  goals: string;
};

export type SetStudentField = <K extends keyof StudentFormValues>(
  key: K,
  value: StudentFormValues[K]
) => void;

export type StudentFieldErrors = Partial<Record<keyof StudentFormValues, string>>;

export type StudentSectionProps = {
  values: StudentFormValues;
  onChange: SetStudentField;
  errors?: StudentFieldErrors;
};

/** Claude Design `FIELD_STYLE_F`. */
export const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: 'var(--card)',
  fontFamily: 'var(--sans)',
  fontSize: 13,
  color: 'var(--ink)',
  boxSizing: 'border-box',
  outline: 'none',
};

export const monoInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--mono)',
};

export const requiredInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--gold-tint)',
  borderColor: 'var(--gold-dim)',
};

/**
 * Segmented-control button. `minWidth: 0` + ellipsis let the three level
 * buttons shrink inside a third of the row — without it "Intermediate" forced
 * the group wider than its grid cell and "Advanced" slid under the Start date
 * input (audit bug B1).
 */
export const segmentBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  minWidth: 0,
  padding: '8px 4px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: active ? 'var(--ink)' : 'var(--card)',
  color: active ? 'var(--paper)' : 'var(--ink-3)',
  fontSize: 11,
  fontWeight: active ? 500 : 400,
  cursor: 'pointer',
  textTransform: 'capitalize',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Claude Design `FieldF`: sans uppercase label, gold required star, italic hint below. */
export const StudentField = ({ label, required, hint, error, children }: FieldProps) => (
  <div style={{ minWidth: 0 }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
        fontFamily: 'var(--sans)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ink-3)',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
      }}
    >
      {label}
      {required && <span style={{ color: 'var(--gold-2)' }}>*</span>}
    </div>
    {children}
    {hint && (
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, fontStyle: 'italic' }}>
        {hint}
      </div>
    )}
    {error && (
      <div
        style={{ marginTop: 4, fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--mono)' }}
      >
        {error}
      </div>
    )}
  </div>
);
