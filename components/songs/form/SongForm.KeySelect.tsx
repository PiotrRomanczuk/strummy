'use client';

import { useTranslations } from 'next-intl';

import { filled, songMonoInput } from './song-form.styles';

const MAJOR_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

/** Mockup key select: gold, mono, with Major / Minor option groups. */
export const SongFormKeySelect = ({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) => {
  const t = useTranslations('Songs');
  return (
    <select
      name="key"
      style={filled(songMonoInput, Boolean(value))}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-describedby={hasError ? 'error-key' : undefined}
    >
      {/* Unknown is a real answer: the song is saved with key = null instead of
          a made-up "C" (the old default). */}
      <option value="">{t('formKeyUnknown')}</option>
      <optgroup label={t('formKeyGroupMajor')}>
        {MAJOR_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
      <optgroup label={t('formKeyGroupMinor')}>
        {MINOR_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </optgroup>
    </select>
  );
};
