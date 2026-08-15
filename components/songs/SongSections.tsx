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
};

const chordBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 12,
  padding: '4px 9px',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: 99,
  color: 'var(--ink-2)',
};

export const SongSections = ({ songId, sections, canEdit }: Props) => {
  const t = useTranslations('Songs');
  const [editingSection, setEditingSection] = useState<SongSection | null | undefined>(undefined);

  return (
    <div data-testid="song-sections">
      <Card>
        <CardHeader
          eyebrow={t('formEyebrow')}
          title={t('sectionsTitle')}
          action={
            canEdit ? (
              <button
                type="button"
                data-testid="add-section-button"
                onClick={() => setEditingSection(null)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--ink)',
                  color: 'var(--ivory)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 12,
                }}
              >
                {t('addSection')}
              </button>
            ) : undefined
          }
        />

        <div style={{ padding: '0 24px 22px' }}>
          {sections.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--ink-4)' }}>{t('noSectionsFound')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sections.map((sec) => (
                <div key={sec.id} data-testid={`song-section-${sec.id}`}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <strong
                      style={{
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {sec.section_type} {sec.section_number}
                    </strong>
                    {canEdit && (
                      <button
                        type="button"
                        data-testid="edit-section-button"
                        onClick={() => setEditingSection(sec)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontSize: 12,
                        }}
                      >
                        {t('editSectionLink')}
                      </button>
                    )}
                  </div>
                  {sec.chords && sec.chords.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {sec.chords.map((chord, i) => (
                        <span key={`${chord}-${i}`} style={chordBadgeStyle}>
                          {chord}
                        </span>
                      ))}
                    </div>
                  )}
                  {sec.lyrics && (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-geist)',
                        whiteSpace: 'pre-wrap',
                        fontSize: 13,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {sec.lyrics}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

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
