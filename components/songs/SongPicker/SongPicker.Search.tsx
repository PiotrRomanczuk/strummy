'use client';

import { Search, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { formStyles as s } from '@/components/_ui/form-styles';

type Props = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  inputId?: string;
  listId: string;
  hintId: string;
  activeOptionId?: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/** Search box for the picker — owns the field's <label>, so the surrounding
 * form labels this input rather than the listbox. */
export const SongPickerSearch = ({
  value,
  placeholder,
  disabled,
  inputId,
  listId,
  hintId,
  activeOptionId,
  onChange,
  onKeyDown,
}: Props) => (
  <div style={{ position: 'relative' }}>
    <Search
      size={14}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 11,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--ink-4)',
        pointerEvents: 'none',
      }}
    />
    <input
      id={inputId}
      type="text"
      className="ui-song-search"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
      aria-controls={listId}
      aria-describedby={hintId}
      aria-activedescendant={activeOptionId}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      style={{ ...s.input, paddingLeft: 32, paddingRight: value ? 32 : 12 }}
    />
    {value && (
      <button
        type="button"
        className="ui-song-clear"
        aria-label="Clear search"
        onClick={() => onChange('')}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'inline-flex',
          padding: 3,
          cursor: 'pointer',
        }}
      >
        <X size={13} />
      </button>
    )}
  </div>
);
