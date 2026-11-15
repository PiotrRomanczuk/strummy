import { useLocale, useTranslations } from 'next-intl';

import type { LatestNote } from '@/lib/services/parent-health-queries';

import { Card, StudentInitials } from '../DashboardPrimitives';
import { Badge, formatNoteDate } from './parent-dashboard.shared';

const firstName = (fullName: string): string => fullName.trim().split(/\s+/)[0] || fullName;

/** The teacher's latest note after a lesson, or a line saying there is none yet. */
export const ParentNoteCard = ({
  note,
  childName,
}: {
  note: LatestNote | null;
  childName: string;
}) => {
  const t = useTranslations('ParentHome');
  const locale = useLocale();

  return (
    <Card>
      <div className="px-6 py-5">
        {note ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <StudentInitials name={note.teacherName} email={null} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-[var(--serif)] text-[19px] font-medium">
                  {note.teacherName
                    ? t('noteTitleFrom', { name: firstName(note.teacherName) })
                    : t('noteTitle')}
                </div>
                <div className="text-xs text-[var(--ink-4)]">
                  {t('noteAfter', { date: formatNoteDate(note.lessonDate, locale) })}
                </div>
              </div>
              <Badge tone="gold">{t('noteNew')}</Badge>
            </div>
            <p className="m-0 max-w-[820px] font-[var(--serif)] text-base leading-[1.65] text-[var(--ink-2)]">
              {note.note}
            </p>
          </>
        ) : (
          <div className="font-[var(--serif)] text-sm italic text-[var(--ink-4)]">
            {t('noteEmpty', { name: firstName(childName) })}
          </div>
        )}
      </div>
    </Card>
  );
};
