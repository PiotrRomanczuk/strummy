import { getTranslations } from 'next-intl/server';

import { Card, CardHeader } from './LessonDetailPrimitives';

export const LessonNotesCard = async ({ notes }: { notes: string | null }) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader eyebrow={t('lessonRecordEyebrow')} title={t('notesTitle')} />
      <div
        style={{
          padding: '20px 24px 24px',
          fontFamily: 'var(--serif)',
          fontSize: 14,
          lineHeight: 1.65,
          color: 'var(--ink-2)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {notes ?? (
          <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>{t('noNotesCaptured')}</span>
        )}
      </div>
    </Card>
  );
};
