'use client';

import { useState, type CSSProperties } from 'react';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';
import { formStyles } from './form.styles';

export type PillStudent = {
  id: string;
  name: string | null;
  email: string | null;
  color?: string | null;
};

type Props = {
  students: PillStudent[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Accessible name for the group. */
  label: string;
  /** Placeholder for the filter box shown when the roster is long. */
  searchPlaceholder: string;
  /** Optional trailing pill, e.g. "+ New student". */
  extraPill?: { label: string; isActive: boolean; onClick: () => void };
};

/** Above this, pills alone stop being scannable — a filter box appears. */
const PILL_LIMIT = 12;

const pillStyle = (isActive: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px 6px 6px',
  borderRadius: 999,
  border: `1px solid ${isActive ? 'var(--gold-2)' : 'var(--rule)'}`,
  background: isActive ? 'var(--gold-tint)' : 'var(--card)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: isActive ? 500 : 400,
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
});

const firstName = (s: PillStudent): string =>
  (s.name?.trim().split(/\s+/)[0] || s.email || '?').toString();

/**
 * Claude Design student picker: avatar pills, gold when chosen. Works for one
 * (lesson) or several (assignment) — the caller decides what `onToggle` does.
 */
export const StudentPillPicker = ({
  students,
  selectedIds,
  onToggle,
  label,
  searchPlaceholder,
  extraPill,
}: Props) => {
  const [query, setQuery] = useState('');
  const isLong = students.length > PILL_LIMIT;
  const q = query.trim().toLowerCase();
  const visible = isLong
    ? [
        ...students.filter((s) => selectedIds.includes(s.id)),
        ...students
          .filter((s) => !selectedIds.includes(s.id))
          .filter((s) => !q || `${s.name ?? ''} ${s.email ?? ''}`.toLowerCase().includes(q))
          .slice(0, PILL_LIMIT),
      ]
    : students;

  return (
    <div>
      {isLong && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          style={{ ...formStyles.input, marginBottom: 10 }}
        />
      )}
      <div role="group" aria-label={label} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {visible.map((s) => {
          const isActive = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              data-testid="student-pill"
              data-student-id={s.id}
              aria-pressed={isActive}
              title={s.name ?? s.email ?? undefined}
              onClick={() => onToggle(s.id)}
              style={pillStyle(isActive)}
            >
              <StudentInitials name={s.name} email={s.email} color={s.color} size={22} />
              <span>{firstName(s)}</span>
            </button>
          );
        })}
        {extraPill && (
          <button
            type="button"
            aria-pressed={extraPill.isActive}
            onClick={extraPill.onClick}
            style={{ ...pillStyle(extraPill.isActive), padding: '6px 12px', borderStyle: 'dashed' }}
          >
            {extraPill.label}
          </button>
        )}
      </div>
    </div>
  );
};
