'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { updateLessonSongNotes } from '@/app/dashboard/lessons/actions';
import type { SongHistoryEntry } from '@/lib/services/lesson-detail-queries';

const monoLabel = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
} as const;

/** "› Notes & history": this lesson's note on the song, plus earlier lessons' takes. */
export const LessonSongNotes = ({
  lessonId,
  songId,
  initialNote,
  history,
  canEdit,
}: {
  lessonId: string;
  songId: string;
  initialNote: string | null;
  history: SongHistoryEntry[];
  canEdit: boolean;
}) => {
  const t = useTranslations('Lessons');
  const tSongs = useTranslations('Songs');
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(initialNote ?? '');
  const [isPending, startTransition] = useTransition();
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const toggleLabel = isOpen
    ? t('songNotesHide')
    : note || history.length
      ? t('songNotesShow')
      : t('songNotesAdd');

  const save = (value: string) => {
    if (!canEdit || value === (initialNote ?? '')) return;
    startTransition(async () => {
      await updateLessonSongNotes(lessonId, songId, value);
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        style={{
          marginTop: 10,
          background: 'none',
          border: 'none',
          padding: 0,
          ...monoLabel,
          fontSize: 11,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Chevron size={10} aria-hidden="true" />
        {toggleLabel}
      </button>
      {isOpen && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={(e) => save(e.target.value)}
            readOnly={!canEdit}
            aria-label={t('songNotesPlaceholder')}
            placeholder={t('songNotesPlaceholder')}
            style={{
              width: '100%',
              minHeight: 72,
              padding: '10px 12px',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              background: 'var(--paper)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--sans)',
              fontSize: 13,
              lineHeight: 1.5,
              resize: 'vertical',
              opacity: isPending ? 0.6 : 1,
            }}
          />
          {history.length > 0 && (
            <div>
              <div style={{ ...monoLabel, marginBottom: 6 }}>{t('songHistoryLabel')}</div>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr',
                    gap: 10,
                    padding: '6px 0',
                    borderBottom: '1px solid var(--rule-2)',
                    fontSize: 12,
                    color: 'var(--ink-3)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {new Date(h.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div>
                    {h.status ? tSongs(`stageShort.${h.status}`) : '—'}
                    {h.notes ? ` · ${h.notes}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
