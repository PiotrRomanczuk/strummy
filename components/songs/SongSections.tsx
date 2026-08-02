'use client';

import { useState } from 'react';
import type { SongSection } from '@/components/songs/types';
import { EditSongSectionModal } from './EditSongSectionModal';

type Props = {
  songId: string;
  sections: SongSection[];
  canEdit: boolean;
};

export const SongSections = ({ songId, sections, canEdit }: Props) => {
  const [editingSection, setEditingSection] = useState<SongSection | null | undefined>(undefined);

  return (
    <div style={{ marginTop: 24, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, fontFamily: 'var(--font-fraunces)' }}>Sections</h3>
        {canEdit && (
          <button
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
            Add Section
          </button>
        )}
      </div>

      {sections.length === 0 ? (
        <p style={{ marginTop: 12, color: 'var(--ink-4)' }}>No sections found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {sections.map((sec) => (
            <div key={sec.id} style={{ border: '1px solid var(--rule)', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono)' }}>
                  {sec.section_type} {sec.section_number}
                </strong>
                {canEdit && (
                  <button
                    onClick={() => setEditingSection(sec)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                {sec.chords && sec.chords.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>CHORDS</div>
                    <pre style={{ margin: 0, fontFamily: 'var(--font-geist-mono)', whiteSpace: 'pre-wrap' }}>{sec.chords.join(' ')}</pre>
                  </div>
                )}
                {sec.lyrics && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>LYRICS</div>
                    <pre style={{ margin: 0, fontFamily: 'var(--font-geist)', whiteSpace: 'pre-wrap' }}>{sec.lyrics}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
