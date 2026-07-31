'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';
import type { AssignmentTemplateRow } from '@/lib/services/assignment-template-queries';

type Props = {
  templates: AssignmentTemplateRow[];
  onApply: (template: AssignmentTemplateRow) => void;
  disabled?: boolean;
};

/** Create-mode "start from template" select — prefills title / brief / checklist. */
export const TemplatePicker = ({ templates, onApply, disabled }: Props) => {
  const t = useTranslations('Assignments');
  if (templates.length === 0) return null;
  return (
    <div style={s.field}>
      <label style={s.label} htmlFor="assignment-template">
        {t('templatePickerLabel')}
      </label>
      <select
        id="assignment-template"
        style={s.input}
        defaultValue=""
        disabled={disabled}
        onChange={(e) => {
          const selected = templates.find((x) => x.id === e.target.value);
          if (selected) onApply(selected);
        }}
      >
        <option value="">{t('templatePickerBlankOption')}</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </div>
  );
};
