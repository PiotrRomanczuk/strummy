'use client';

import { useTranslations } from 'next-intl';

import type { SongLevel } from '@/components/shared/level-label.helpers';

import { Field } from './Field';
import { SongNotesAI } from '@/components/songs/form/SongNotesAI';
import { SHOW_AI_FEATURES } from '@/lib/config/features';
import { songInput } from './song-form.styles';

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

/** Teaching notes — the Generate / Enhance buttons sit in the label row, as in the mockup. */
export const SongFormFieldsNotes = ({ notes, notesError, pending, songData, onNotes }: Props) => {
  const t = useTranslations('Songs');

  return (
    <Field
      label={t('formLabelTeachingNotes')}
      error={notesError}
      labelAction={
        SHOW_AI_FEATURES ? (
          <SongNotesAI
            songData={songData}
            currentNotes={notes}
            onNotesGenerated={onNotes}
            disabled={pending}
          />
        ) : undefined
      }
    >
      <textarea
        name="notes"
        maxLength={4000}
        placeholder={
          SHOW_AI_FEATURES ? t('formNotesPlaceholderWithAi') : t('formNotesPlaceholderNoAi')
        }
        style={{ ...songInput, minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
      />
    </Field>
  );
};
