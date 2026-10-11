'use client';

import type { CSSProperties, ReactNode } from 'react';
import { X } from 'lucide-react';

import { FormAvatar } from '@/components/shared/FormAvatar';
import type { StudentOption } from '@/lib/services/lesson-form-data';

export const qaInput: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

/** Mono micro-label used throughout the Quick assign card. */
export const QaField = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) => (
  <div>
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

/** Chosen students as removable chips, plus a dashed "+ Add" picker. */
export const QaStudents = ({
  students,
  selectedIds,
  addLabel,
  onAdd,
  onRemove,
}: {
  students: StudentOption[];
  selectedIds: string[];
  addLabel: string;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {students
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => (
        <span
          key={s.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px 4px 4px',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 99,
            fontSize: 12,
          }}
        >
          <FormAvatar name={s.name} email={s.email} color={s.color} size={18} />
          {(s.name ?? s.email ?? '').split(/\s+/)[0]}
          <button
            type="button"
            aria-label={`Remove ${s.name ?? s.email}`}
            onClick={() => onRemove(s.id)}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--ink-4)',
              display: 'grid',
            }}
          >
            <X size={10} />
          </button>
        </span>
      ))}
    <label
      style={{
        position: 'relative',
        padding: '4px 10px',
        borderRadius: 99,
        border: '1px dashed var(--rule)',
        fontSize: 12,
        color: 'var(--ink-4)',
        cursor: 'pointer',
      }}
    >
      {addLabel}
      <select
        id="quick-assign-student"
        aria-label={addLabel}
        data-testid="quick-assign-add-student"
        value=""
        onChange={(e) => e.target.value && onAdd(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      >
        <option value="" />
        {students
          .filter((s) => !selectedIds.includes(s.id))
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.email}
            </option>
          ))}
      </select>
    </label>
  </div>
);
