'use client';

import { useTranslations } from 'next-intl';
import { LYRICS_MAX_LENGTH } from '@/schemas/CommonSchema';

import { Field } from './Field';
import { songInput } from './song-form.styles';

type Props = { value: string; onChange: (v: string) => void; error?: string };

/** Controlled monospace lyrics-with-chords editor, shared by the create and edit
 * song forms. Chords typed above the lyrics align because the font is monospace. */
export const SongFormFieldsLyrics = ({ value, onChange, error }: Props) => {
  const t = useTranslations('Songs');

  return (
    <Field
      label={t('formLyricsWithChordsLabel')}
      hint={t('formLyricsHint')}
      error={error}
      fieldId="lyrics"
    >
      <textarea
        name="lyrics_with_chords"
        maxLength={LYRICS_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('formLyricsPlaceholder')}
        style={{
          ...songInput,
          fontFamily: 'var(--mono)',
          fontSize: 12,
          lineHeight: 1.7,
          minHeight: 140,
          resize: 'vertical',
        }}
        aria-describedby={error ? 'error-lyrics' : undefined}
      />
    </Field>
  );
};
