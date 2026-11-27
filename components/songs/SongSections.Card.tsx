'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { SongSection } from '@/components/songs/types';
import { Card, CardHeader } from './SongPrimitives';
import { EditSongSectionModal } from './EditSongSectionModal';

type Props = {
  songId: string;
  sections: SongSection[];
  canEdit: boolean;
  /** Only the "Add section" button, without the card: the song map already shows the parts. */
  isCompact?: boolean;
};

const addButton =
  'cursor-pointer rounded bg-[var(--ink)] px-3 py-1.5 font-mono text-xs text-[var(--ivory)]';

const SectionItem = ({
  section,
  onEdit,
}: {
  section: SongSection;
  onEdit: (() => void) | null;
}) => {
  const t = useTranslations('Songs');
  return (
    <div data-testid={`song-section-${section.id}`}>
      <div className="mb-2 flex items-center justify-between">
        <strong className="font-mono text-xs uppercase text-[var(--ink-3)]">
          {section.section_type} {section.section_number}
        </strong>
        {onEdit && (
          <button
            type="button"
            data-testid="edit-section-button"
            onClick={onEdit}
            className="cursor-pointer text-xs underline"
          >
            {t('editSectionLink')}
          </button>
        )}
      </div>
      {section.chords && section.chords.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {section.chords.map((chord, i) => (
            <span
              key={`${chord}-${i}`}
              className="rounded-full border border-[var(--rule)] bg-[var(--paper)] px-[9px] py-1 font-mono text-xs text-[var(--ink-2)]"
            >
              {chord}
            </span>
          ))}
        </div>
      )}
      {section.lyrics && (
        <pre className="m-0 whitespace-pre-wrap font-sans text-[13px] text-[var(--ink-3)]">
          {section.lyrics}
        </pre>
      )}
    </div>
  );
};

export const SongSectionsCard = ({ songId, sections, canEdit, isCompact = false }: Props) => {
  const t = useTranslations('Songs');
  const [editingSection, setEditingSection] = useState<SongSection | null | undefined>(undefined);
  const add = canEdit ? (
    <button
      type="button"
      data-testid="add-section-button"
      onClick={() => setEditingSection(null)}
      className={addButton}
    >
      {t('addSection')}
    </button>
  ) : undefined;

  return (
    <div data-testid="song-sections">
      {isCompact ? (
        <div className="flex justify-end">{add}</div>
      ) : (
        <Card>
          <CardHeader eyebrow={t('formEyebrow')} title={t('sectionsTitle')} action={add} />
          <div className="px-6 pb-[22px]">
            {sections.length === 0 ? (
              <p className="m-0 text-[var(--ink-4)]">{t('noSectionsFound')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {sections.map((section) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    onEdit={canEdit ? () => setEditingSection(section) : null}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {editingSection !== undefined && (
        <EditSongSectionModal
          songId={songId}
          section={editingSection}
          onClose={() => setEditingSection(undefined)}
        />
      )}
    </div>
  );
};
