'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALL_CHORD_NAMES, CHORD_VOICINGS } from '@/lib/music-theory/chord-voicings';
import { songChipBox } from './song-form.styles';

/** Chord name text → the diagram to preview, when the app recognizes it. */
export const voicingForChordName = (name: string) =>
  CHORD_VOICINGS.find((v) => v.name.toLowerCase() === name.trim().toLowerCase());

/** Parses the DB's comma-separated `chords` string into a chip list. */
export const parseChordsString = (chords: string): string[] =>
  chords
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

type Props = {
  chords: string[];
  onChange: (chords: string[]) => void;
};

/** Claude Design chord strip: chips inline, then a "+" entry that autocompletes
 * against the curated voicing set. Click a chip to remove it. */
export const SongFormFieldsChords = ({ chords, onChange }: Props) => {
  const t = useTranslations('Songs');
  const [draft, setDraft] = useState('');

  const addChord = () => {
    const name = draft.trim();
    if (!name || chords.includes(name)) return;
    onChange([...chords, name]);
    setDraft('');
  };
  const removeChord = (name: string) => onChange(chords.filter((c) => c !== name));

  return (
    <div style={songChipBox}>
      <datalist id="song-chord-suggestions">
        {ALL_CHORD_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {chords.map((name) => (
        <button
          type="button"
          key={name}
          onClick={() => removeChord(name)}
          aria-label={t('formRemoveChordAria', { name })}
          title={t('formRemoveChordAria', { name })}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--rule-2)',
            color: 'var(--ink-2)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {name}
        </button>
      ))}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flex: 1,
          minWidth: 70,
          borderLeft: chords.length > 0 ? '1px solid var(--rule)' : 'none',
          paddingLeft: chords.length > 0 ? 8 : 0,
        }}
      >
        <button
          type="button"
          onClick={addChord}
          aria-label={t('formAddChordButton')}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--ink-4)',
            fontFamily: 'var(--mono)',
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          +
        </button>
        <input
          list="song-chord-suggestions"
          className="ui-bare-datalist"
          value={draft}
          placeholder={chords.length === 0 ? t('formChordPlaceholder') : ''}
          aria-label={t('formChordsLabel')}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--ink)',
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={addChord}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
              e.preventDefault();
              addChord();
            }
          }}
        />
      </span>
    </div>
  );
};
