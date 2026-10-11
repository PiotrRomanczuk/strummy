'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form.styles';

type Props = {
  title: string;
  notes: string;
  onTitle: (v: string) => void;
  onNotes: (v: string) => void;
};

/** Section IV — "Lesson plan notes": the plan, plus the lesson's list title. */
export const LessonFormFieldsNotes = ({ title, notes, onTitle, onNotes }: Props) => {
  const t = useTranslations('Lessons');
  return (
    <>
      <div style={s.field}>
        <label style={s.label} htmlFor="lesson-title">
          {t('colTitle')}
        </label>
        <input
          id="lesson-title"
          style={s.input}
          value={title}
          placeholder={t('titlePlaceholder')}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      <div style={{ ...s.field, marginBottom: 0 }}>
        <label style={s.label} htmlFor="lesson-notes">
          {t('notesTitle')}
        </label>
        <textarea
          id="lesson-notes"
          style={s.textarea}
          value={notes}
          placeholder={t('notesPlaceholder')}
          onChange={(e) => onNotes(e.target.value)}
        />
        <span style={s.hint}>{t('notesHint')}</span>
      </div>
    </>
  );
};
