'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/** Lesson-notes textarea that saves itself on blur through the lessons API. */
export const LessonNotesEditor = ({ lessonId, initial }: { lessonId: string; initial: string }) => {
  const t = useTranslations('Lessons');
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  const save = async () => {
    if (value === saved) return;
    setState('saving');
    const res = await fetch(`/api/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value }),
    });
    if (!res.ok) return setState('error');
    setSaved(value);
    setState('idle');
  };

  return (
    <>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        aria-label={t('lessonNotesTitle')}
        placeholder={t('lessonNotesPlaceholder')}
        style={{
          width: '100%',
          minHeight: 96,
          padding: '12px 14px',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontFamily: 'var(--sans)',
          fontSize: 13,
          lineHeight: 1.55,
          resize: 'vertical',
          opacity: state === 'saving' ? 0.6 : 1,
        }}
      />
      {state === 'error' && (
        <div
          style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--mono)' }}
        >
          {t('notesSaveFailed')}
        </div>
      )}
    </>
  );
};
