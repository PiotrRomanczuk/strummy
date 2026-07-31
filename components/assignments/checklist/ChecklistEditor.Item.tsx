'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/_ui/form-styles';
import type { ChecklistItem } from '@/schemas/AssignmentSchema';

type Props = {
  item: ChecklistItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onTextChange: (id: string, text: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
};

const iconButton: React.CSSProperties = {
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--card)',
  color: 'var(--ink-3)',
  width: 30,
  height: 30,
  cursor: 'pointer',
  fontSize: 13,
  flexShrink: 0,
};

/** Single editable row within ChecklistEditor: text input + reorder/remove controls. */
export const ChecklistEditorItem = ({
  item,
  index,
  isFirst,
  isLast,
  disabled,
  onTextChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) => {
  const t = useTranslations('Assignments');

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        style={{ ...s.input, flex: 1 }}
        value={item.text}
        placeholder={t('checklistEditorStepPlaceholder', { step: index + 1 })}
        onChange={(e) => onTextChange(item.id, e.target.value)}
        disabled={disabled}
        aria-label={t('checklistEditorItemAriaLabel', { step: index + 1 })}
      />
      <button
        type="button"
        style={iconButton}
        onClick={() => onMoveUp(index)}
        disabled={disabled || isFirst}
        aria-label={t('checklistEditorMoveUpAriaLabel')}
      >
        ↑
      </button>
      <button
        type="button"
        style={iconButton}
        onClick={() => onMoveDown(index)}
        disabled={disabled || isLast}
        aria-label={t('checklistEditorMoveDownAriaLabel')}
      >
        ↓
      </button>
      <button
        type="button"
        style={{ ...iconButton, color: 'var(--danger)' }}
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={t('checklistEditorRemoveAriaLabel')}
      >
        ×
      </button>
    </div>
  );
};
