import { getTranslations } from 'next-intl/server';

import { LessonNotesEditor } from './LessonDetail.NotesEditor';
import { Card, CardHeader } from './LessonDetailPrimitives';

/** Claude Design "Plan & observations / Lesson notes" — editable for the teacher. */
export const LessonNotesCard = async ({
  notes,
  lessonId,
  canEdit,
}: {
  notes: string | null;
  lessonId: string;
  canEdit: boolean;
}) => {
  const t = await getTranslations('Lessons');
  return (
    <Card>
      <CardHeader eyebrow={t('planEyebrow')} title={t('lessonNotesTitle')} />
      <div style={{ padding: '0 24px 22px' }}>
        {canEdit ? (
          <LessonNotesEditor lessonId={lessonId} initial={notes ?? ''} />
        ) : (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--ink-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {notes || <em style={{ color: 'var(--ink-4)' }}>{t('noNotesShort')}</em>}
          </div>
        )}
      </div>
    </Card>
  );
};
