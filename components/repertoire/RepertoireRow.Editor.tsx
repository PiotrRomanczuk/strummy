'use client';

import type { CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

const fieldStyle: CSSProperties = { display: 'grid', gap: 6 };
const labelStyle: CSSProperties = { fontSize: 12, color: 'var(--ink-3)' };

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--rule)',
  borderRadius: 8,
  background: 'var(--card)',
  color: 'var(--ink)',
  fontFamily: 'inherit',
  fontSize: 13,
  resize: 'vertical',
};

const pipStyle = (isOn: boolean): CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 999,
  fontSize: 13,
  cursor: 'pointer',
  border: `1px solid ${isOn ? 'var(--gold-2)' : 'var(--rule)'}`,
  background: isOn ? 'var(--gold-2)' : 'transparent',
  color: isOn ? 'var(--ivory)' : 'var(--ink-2)',
});

const saveStyle = (isPending: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--gold-2)',
  color: 'var(--ivory)',
  fontSize: 13,
  fontWeight: 500,
  cursor: isPending ? 'default' : 'pointer',
  opacity: isPending ? 0.6 : 1,
});

type Props = {
  entryId: string;
  notes: string;
  onNotesChange: (value: string) => void;
  difficulty: number | '';
  onDifficultyChange: (value: number) => void;
  onSave: () => void;
  isPending: boolean;
};

/**
 * The notes + difficulty panel behind a repertoire row's toggle.
 *
 * Split out of `RepertoireRow` so neither file carries a 160-line render: the
 * row owns the state and the save call, this owns the form.
 */
export const RepertoireRowEditor = ({
  entryId,
  notes,
  onNotesChange,
  difficulty,
  onDifficultyChange,
  onSave,
  isPending,
}: Props) => {
  const t = useTranslations('Repertoire');

  return (
    <div style={{ padding: '4px 20px 18px', display: 'grid', gap: 14 }}>
      <div style={fieldStyle}>
        <label htmlFor={`notes-${entryId}`} style={labelStyle}>
          {t('notesLabel')}
        </label>
        <textarea
          id={`notes-${entryId}`}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder={t('notesPlaceholder')}
          style={textareaStyle}
        />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>{t('difficultyLabel')}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {DIFFICULTIES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onDifficultyChange(n)}
              aria-label={t('setDifficultyAriaLabel', { level: n })}
              aria-pressed={difficulty === n}
              style={pipStyle(difficulty === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button type="button" disabled={isPending} onClick={onSave} style={saveStyle(isPending)}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('saveButton')}
        </button>
      </div>
    </div>
  );
};
