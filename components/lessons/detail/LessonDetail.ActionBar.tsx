import Link from 'next/link';
import { ArrowLeft, History, Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { RevisionHistoryModal } from '@/components/history/RevisionHistoryModal';
import type { LessonDetail, LessonHistoryEntry } from '@/lib/services/lesson-detail-queries';
import { LessonDeleteButton } from './LessonDetail.DeleteButton';
import { LessonRecapButton } from './LessonDetail.RecapButton';
import { lessonGhostButton } from './lesson-detail.styles';

/** Claude Design breadcrumb + actions row above the lesson hero. */
export const LessonActionBar = async ({
  lesson,
  canEdit,
  history,
  counterpartDisplay,
}: {
  lesson: LessonDetail;
  canEdit: boolean;
  history: LessonHistoryEntry[];
  counterpartDisplay: string;
}) => {
  const t = await getTranslations('Lessons');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Link href="/dashboard/lessons" style={{ ...lessonGhostButton, padding: '6px 10px' }}>
        <ArrowLeft size={12} strokeWidth={1.6} aria-hidden="true" /> {t('title')}
      </Link>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>/</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
        {lesson.lessonTeacherNumber != null ? `#${lesson.lessonTeacherNumber} · ` : ''}
        {counterpartDisplay}
      </span>
      <div style={{ flex: 1 }} />
      {canEdit && history.length > 0 && (
        <RevisionHistoryModal
          history={history}
          triggerButton={
            <button type="button" style={lessonGhostButton}>
              <History size={12} strokeWidth={1.6} aria-hidden="true" /> {t('historyButton')}
            </button>
          }
        />
      )}
      {canEdit && (
        <>
          {lesson.status.toLowerCase() === 'completed' && (
            <LessonRecapButton lessonId={lesson.id} />
          )}
          <Link href={`/dashboard/lessons/${lesson.id}/edit`} style={lessonGhostButton}>
            <Pencil size={12} strokeWidth={1.6} aria-hidden="true" /> {t('editShort')}
          </Link>
          <LessonDeleteButton lessonId={lesson.id} />
        </>
      )}
    </div>
  );
};
