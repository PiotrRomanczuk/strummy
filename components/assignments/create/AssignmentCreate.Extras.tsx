'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import { FormSection } from '@/components/shared/FormSection';
import { ChecklistEditor } from '@/components/assignments/checklist/ChecklistEditor';
import { ChordDrillEditor } from '@/components/assignments/chord-drill/ChordDrillEditor';
import { TemplatePicker } from '@/components/assignments/create/TemplatePicker';
import type { AssignmentTemplateRow } from '@/lib/services/assignment-template-queries';
import type { ChecklistItem } from '@/schemas/AssignmentSchema';

type Props = {
  mode: 'create' | 'edit';
  title: string;
  titlePlaceholder: string;
  checklist: ChecklistItem[];
  chordIds: string[];
  templates?: AssignmentTemplateRow[];
  alsoSaveAsTemplate: boolean;
  disabled: boolean;
  onTitle: (v: string) => void;
  onChecklist: (v: ChecklistItem[]) => void;
  onChordIds: (v: string[]) => void;
  onApplyTemplate: (t: AssignmentTemplateRow) => void;
  onAlsoSaveAsTemplate: (v: boolean) => void;
};

/**
 * Everything beyond the four Claude Design sections — custom title, checklist,
 * chord drill, templates — collected in one section that starts collapsed so
 * the form reads like the mockup.
 */
export const AssignmentCreateExtras = ({
  mode,
  title,
  titlePlaceholder,
  checklist,
  chordIds,
  templates,
  alsoSaveAsTemplate,
  disabled,
  onTitle,
  onChecklist,
  onChordIds,
  onApplyTemplate,
  onAlsoSaveAsTemplate,
}: Props) => {
  const t = useTranslations('Assignments');
  const populated = [title, checklist.length > 0, chordIds.length > 0].filter(Boolean).length;

  return (
    <FormSection
      numeral={t('createFormNumeralExtras')}
      title={t('createFormSectionExtrasTitle')}
      count={3}
      populated={populated}
      defaultOpen={mode === 'edit' && populated > 0}
    >
      {mode === 'create' && templates && (
        <TemplatePicker templates={templates} disabled={disabled} onApply={onApplyTemplate} />
      )}
      <div style={s.field}>
        <label style={s.label} htmlFor="assignment-title">
          {t('createFormTitleLabel')}
        </label>
        <input
          id="assignment-title"
          style={s.input}
          value={title}
          placeholder={titlePlaceholder}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      <ChecklistEditor items={checklist} onChange={onChecklist} disabled={disabled} />
      <ChordDrillEditor selected={chordIds} onChange={onChordIds} disabled={disabled} />
      {mode === 'create' && (
        <label
          htmlFor="assignment-save-template"
          style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}
        >
          <input
            id="assignment-save-template"
            type="checkbox"
            checked={alsoSaveAsTemplate}
            onChange={(e) => onAlsoSaveAsTemplate(e.target.checked)}
            disabled={disabled}
          />
          {t('createFormSaveTemplateCheckbox')}
        </label>
      )}
    </FormSection>
  );
};
