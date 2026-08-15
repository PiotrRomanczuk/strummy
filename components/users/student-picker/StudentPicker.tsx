'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

export type StudentPickerOption = {
  id: string;
  name: string | null;
  email: string | null;
};

type Props = {
  students: StudentPickerOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

const displayName = (s: StudentPickerOption) => s.name || s.email || s.id;

/**
 * Simple filterable multi-select for a teacher's own student list. Unlike
 * `SongPicker` (which pages/keyboard-navigates a large song catalog), a
 * teacher's roster is small enough that a plain checkbox list with a text
 * filter covers the same job without the extra complexity.
 */
export const StudentPicker = ({ students, selectedIds, onChange }: Props) => {
  const t = useTranslations('Songs');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => displayName(s).toLowerCase().includes(q));
  }, [students, query]);

  const selected = useMemo(
    () => students.filter((s) => selectedIds.includes(s.id)),
    [students, selectedIds]
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id]
    );
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {selected.map((s) => (
            <span
              key={s.id}
              data-testid={`student-chip-${s.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                padding: '3px 8px',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 99,
                color: 'var(--ink-2)',
              }}
            >
              {displayName(s)}
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-label={t('removeStudent', { name: displayName(s) })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-4)',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        data-testid="student-picker-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchStudents')}
        style={{
          width: '100%',
          padding: '6px 10px',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 8,
        }}
      />

      <div
        role="listbox"
        aria-multiselectable="true"
        style={{
          maxHeight: 160,
          overflowY: 'auto',
          border: '1px solid var(--rule)',
          borderRadius: 6,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-4)' }}>
            {t('noStudentsFound')}
          </div>
        ) : (
          filtered.map((s) => {
            const isSelected = selectedIds.includes(s.id);
            return (
              <label
                key={s.id}
                data-testid={`student-option-${s.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 13,
                  borderBottom: '1px solid var(--rule-2)',
                  background: isSelected ? 'var(--paper)' : 'transparent',
                }}
              >
                <input type="checkbox" checked={isSelected} onChange={() => toggle(s.id)} />
                {displayName(s)}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};
