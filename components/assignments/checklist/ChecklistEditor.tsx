'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/_ui/form-styles';
import type { ChecklistItem } from '@/schemas/AssignmentSchema';
import { ChecklistEditorItem } from './ChecklistEditor.Item';

const MAX_ITEMS = 20;

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c-${Math.random().toString(36).slice(2)}`;

type Props = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  disabled?: boolean;
};

/** Teacher-facing checklist authoring: add / edit / reorder / remove sub-tasks. */
export const ChecklistEditor = ({ items, onChange, disabled }: Props) => {
  const t = useTranslations('Assignments');
  const setText = (id: string, text: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const add = () => {
    if (items.length >= MAX_ITEMS) return;
    onChange([...items, { id: newId(), text: '', done: false }]);
  };
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[index], copy[j]] = [copy[j], copy[index]];
    onChange(copy);
  };

  return (
    <div style={s.field}>
      <label style={s.label}>{t('checklistEditorLabel')}</label>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, index) => (
            <ChecklistEditorItem
              key={item.id}
              item={item}
              index={index}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              disabled={disabled}
              onTextChange={setText}
              onMoveUp={(i) => move(i, -1)}
              onMoveDown={(i) => move(i, 1)}
              onRemove={remove}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        disabled={disabled || items.length >= MAX_ITEMS}
        style={{
          ...s.cancel,
          marginTop: items.length > 0 ? 10 : 4,
          alignSelf: 'flex-start',
          cursor: items.length >= MAX_ITEMS ? 'not-allowed' : 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        {items.length >= MAX_ITEMS
          ? t('checklistEditorMaxItems')
          : t('checklistEditorAddItemButton')}
      </button>
    </div>
  );
};
