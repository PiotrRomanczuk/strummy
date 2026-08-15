'use client';

import { useTranslations } from 'next-intl';

import type { SongLevel } from '@/components/shared/level-label.helpers';

import { Field } from './Field';
import { SongNotesAI } from '@/components/songs/form/SongNotesAI';
import { SHOW_AI_FEATURES } from '@/lib/config/features';

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
  minHeight: 120,
  resize: 'vertical' as const,
  lineHeight: 1.5,
};

type Props = {
  notes: string;
  notesError?: string;
  pending: boolean;
  songData: {
    title: string;
    author: string;
    level: SongLevel;
    key: string;
    chords: string;
    tempo: number | null;
    capo_fret: number | null;
    strumming_pattern: string;
  };
  onNotes: (v: string) => void;
};

/** Section III — teaching notes, with the optional AI-assist button. */
export const SongFormFieldsNotes = ({ notes, notesError, pending, songData, onNotes }: Props) => {
  const t = useTranslations('Songs');

  return (
    <Field label={t('formLabelTeachingNotes')} error={notesError} optional>
      {SHOW_AI_FEATURES && (
        <SongNotesAI
          songData={songData}
          currentNotes={notes}
          onNotesGenerated={onNotes}
          disabled={pending}
        />
      )}
      <textarea
        name="notes"
        maxLength={4000}
        placeholder={
          SHOW_AI_FEATURES ? t('formNotesPlaceholderWithAi') : t('formNotesPlaceholderNoAi')
        }
        style={{ ...textareaStyle, marginTop: SHOW_AI_FEATURES ? 10 : 0 }}
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
      />
    </Field>
  );
};
