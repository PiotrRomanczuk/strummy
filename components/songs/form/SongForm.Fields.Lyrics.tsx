'use client';

import { useTranslations } from 'next-intl';
import { LYRICS_MAX_LENGTH } from '@/schemas/CommonSchema';

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  background: 'var(--paper)',
  fontFamily: 'var(--mono)',
  fontSize: 13,
  color: 'var(--ink)',
  minHeight: 160,
  resize: 'vertical',
  lineHeight: 1.5,
};

const Label = () => {
  const t = useTranslations('Songs');

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
        }}
      >
        {t('formLyricsWithChordsLabel')}
      </span>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--ink-5)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
        }}
      >
        {t('formLyricsOptionalMonospace')}
      </span>
    </div>
  );
};

type Props = { value: string; onChange: (v: string) => void; error?: string };

/** Controlled monospace lyrics-with-chords editor, shared by the create and edit
 * song forms. Chords typed above the lyrics align because the font is monospace. */
export const SongFormFieldsLyrics = ({ value, onChange, error }: Props) => {
  const t = useTranslations('Songs');

  return (
    <div>
      <Label />
      <textarea
        name="lyrics_with_chords"
        maxLength={LYRICS_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('formLyricsPlaceholder')}
        style={textareaStyle}
        aria-describedby={error ? 'error-lyrics' : undefined}
      />
      {error && (
        <div
          id="error-lyrics"
          style={{ marginTop: 4, fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--mono)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
