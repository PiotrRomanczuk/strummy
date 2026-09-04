import { useTranslations } from 'next-intl';

import {
  CHROMATIC_NOTES,
  CHORD_DEFINITIONS,
  SCALE_DEFINITIONS,
  formatNote,
  getChordDisplayName,
  type NoteName,
} from '@/lib/music-theory';

import { chordName, scaleName } from './fretboard.i18n';
import { Group, Segmented } from './Fretboard.Primitives';
import { chipButton, selectStyle } from './fretboard.styles';

/** Scales promoted to one-tap buttons above the full dropdown. */
const QUICK_SCALES = ['major', 'natural_minor', 'pentatonic_minor', 'blues'];

export const KeyGrid = ({
  fbKey,
  setKey,
  useFlats,
  setUseFlats,
}: {
  fbKey: NoteName;
  setKey: (note: NoteName) => void;
  useFlats: boolean;
  setUseFlats: (value: boolean) => void;
}) => {
  const t = useTranslations('Fretboard');
  return (
    <Group
      label={t('key.label')}
      aside={
        <Segmented
          testId="fb-accidental"
          size="sm"
          label={t('key.accidentals')}
          value={useFlats ? 'flat' : 'sharp'}
          onChange={(value) => setUseFlats(value === 'flat')}
          options={[
            { value: 'sharp', label: '♯', ariaLabel: t('key.sharps') },
            { value: 'flat', label: '♭', ariaLabel: t('key.flats') },
          ]}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
        {CHROMATIC_NOTES.map((note) => {
          const active = fbKey === note;
          const isAccidental = note.length > 1;
          return (
            <button
              key={note}
              type="button"
              className="ui-fb-chip"
              data-testid={`fb-key-${note}`}
              data-active={active}
              aria-pressed={active}
              aria-label={t('key.of', { note: formatNote(note, useFlats) })}
              onClick={() => setKey(note)}
              style={{
                ...chipButton(active),
                padding: '10px 0',
                background: active ? 'var(--gold)' : isAccidental ? 'var(--rule-2)' : 'var(--card)',
                color: active ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--serif)',
                fontSize: 16,
                boxShadow: active ? '0 1px 4px rgba(177,127,18,.35)' : 'none',
              }}
            >
              {formatNote(note, useFlats)}
            </button>
          );
        })}
      </div>
    </Group>
  );
};

export const ScaleSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) => {
  const t = useTranslations('Fretboard');
  return (
    <Group label={t('scale.label')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
        {QUICK_SCALES.map((key) => (
          <button
            key={key}
            type="button"
            className="ui-fb-chip"
            data-testid={`fb-scale-${key}`}
            data-active={value === key}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            style={{ ...chipButton(value === key), padding: '7px 10px', textAlign: 'left' }}
          >
            {scaleName(t, key).replace(/\s*\(.*\)$/, '')}
          </button>
        ))}
      </div>
      <select
        data-testid="fb-scale-select"
        aria-label={t('scale.label')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={selectStyle}
      >
        {Object.keys(SCALE_DEFINITIONS).map((key) => (
          <option key={key} value={key}>
            {scaleName(t, key)}
          </option>
        ))}
      </select>
    </Group>
  );
};

export const ChordSelector = ({
  fbKey,
  value,
  onChange,
  useFlats,
}: {
  fbKey: NoteName;
  value: string;
  onChange: (key: string) => void;
  useFlats: boolean;
}) => {
  const t = useTranslations('Fretboard');
  return (
    <Group label={t('chord.label')}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {Object.entries(CHORD_DEFINITIONS).map(([key, def]) => {
          const active = value === key;
          const display = getChordDisplayName(fbKey, key).replace(
            fbKey,
            formatNote(fbKey, useFlats)
          );
          return (
            <button
              key={key}
              type="button"
              className="ui-fb-chip"
              data-testid={`fb-chord-${key}`}
              data-active={active}
              aria-pressed={active}
              aria-label={t('chord.aria', { name: chordName(t, key), display })}
              onClick={() => onChange(key)}
              style={{
                ...chipButton(active),
                padding: '7px 4px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                borderRadius: 6,
              }}
            >
              {def.suffix || 'maj'}
            </button>
          );
        })}
      </div>
    </Group>
  );
};
