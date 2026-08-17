'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const noteTextStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 12,
  color: 'var(--ink-4)',
  marginTop: 4,
  whiteSpace: 'pre-wrap',
};

const smallActionStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--gold-2)',
  background: 'none',
  border: 'none',
  padding: 0,
  marginTop: 4,
  cursor: 'pointer',
};

/** The read path — what a student sees. Renders nothing when there is no note. */
export const SkillNoteText = ({ note }: { note: string | null | undefined }) => {
  if (!note) return null;
  return (
    <div style={noteTextStyle} data-testid="skill-note-text">
      {note}
    </div>
  );
};

type EditorProps = {
  skillName: string;
  note: string | null | undefined;
  isSaving: boolean;
  onSave: (notes: string) => void;
};

/**
 * The write path (teacher/admin only).
 *
 * Only rendered for a skill that already has a status: `upsertStudentSkill`
 * takes `status` as a required argument, so a note cannot exist without an
 * assessment. That is a fair constraint rather than a limitation to route
 * around — a note about nothing is not an assessment.
 */
export const SkillNoteEditor = ({ skillName, note, isSaving, onSave }: EditorProps) => {
  const t = useTranslations('Users');
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? '');

  if (!isOpen) {
    return (
      <>
        <SkillNoteText note={note} />
        <button
          type="button"
          // Qualified with the skill name for the same reason the status select
          // is: a level renders 20+ rows, and twenty identical "Add note"
          // buttons tell a screen-reader user nothing about which skill.
          aria-label={`${note ? t('skillNoteEdit') : t('skillNoteAdd')}: ${skillName}`}
          style={smallActionStyle}
          disabled={isSaving}
          onClick={() => {
            setDraft(note ?? '');
            setIsOpen(true);
          }}
        >
          {note ? t('skillNoteEdit') : t('skillNoteAdd')}
        </button>
      </>
    );
  }

  return (
    <div style={{ marginTop: 6 }} data-testid="skill-note-editor">
      <textarea
        aria-label={`${t('skillNoteLabel')}: ${skillName}`}
        value={draft}
        maxLength={1000}
        rows={2}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('skillNotePlaceholder')}
        style={{
          width: '100%',
          fontFamily: 'var(--sans)',
          fontSize: 12,
          color: 'var(--ink-2)',
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: '6px 8px',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          aria-label={`${t('skillNoteSave')}: ${skillName}`}
          style={smallActionStyle}
          disabled={isSaving}
          onClick={() => {
            onSave(draft);
            setIsOpen(false);
          }}
        >
          {t('skillNoteSave')}
        </button>
        <button
          type="button"
          aria-label={`${t('skillNoteCancel')}: ${skillName}`}
          style={{ ...smallActionStyle, color: 'var(--ink-4)' }}
          disabled={isSaving}
          onClick={() => setIsOpen(false)}
        >
          {t('skillNoteCancel')}
        </button>
      </div>
    </div>
  );
};
