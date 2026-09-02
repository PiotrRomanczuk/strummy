import {
  CAGED_ORDER,
  CHROMATIC_NOTES,
  CHORD_DEFINITIONS,
  SCALE_DEFINITIONS,
  formatNote,
  getChordDisplayName,
  type NoteName,
} from '@/lib/music-theory';

import type { CagedSelection } from './fretboard.helpers';
import { Group, Segmented } from './Fretboard.Primitives';
import { chipButton, selectStyle } from './fretboard.styles';

/** Scales promoted to one-tap buttons above the full dropdown. */
const QUICK_SCALES = ['major', 'natural_minor', 'pentatonic_minor', 'blues'];

const CAGED_OPTIONS: CagedSelection[] = ['none', ...CAGED_ORDER, 'all'];

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
}) => (
  <Group
    label="Key"
    aside={
      <Segmented
        testId="fb-accidental"
        size="sm"
        label="Accidental spelling"
        value={useFlats ? 'flat' : 'sharp'}
        onChange={(value) => setUseFlats(value === 'flat')}
        options={[
          { value: 'sharp', label: '♯', ariaLabel: 'Use sharps' },
          { value: 'flat', label: '♭', ariaLabel: 'Use flats' },
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
            aria-label={`Key of ${formatNote(note, useFlats)}`}
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

export const ScaleSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) => (
  <Group label="Scale">
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
          {SCALE_DEFINITIONS[key].name.replace(/\s*\(.*\)$/, '')}
        </button>
      ))}
    </div>
    <select
      data-testid="fb-scale-select"
      aria-label="Scale"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={selectStyle}
    >
      {Object.entries(SCALE_DEFINITIONS).map(([key, def]) => (
        <option key={key} value={key}>
          {def.name}
        </option>
      ))}
    </select>
  </Group>
);

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
}) => (
  <Group label="Chord">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
      {Object.entries(CHORD_DEFINITIONS).map(([key, def]) => {
        const active = value === key;
        const display = getChordDisplayName(fbKey, key).replace(fbKey, formatNote(fbKey, useFlats));
        return (
          <button
            key={key}
            type="button"
            className="ui-fb-chip"
            data-testid={`fb-chord-${key}`}
            data-active={active}
            aria-pressed={active}
            aria-label={`${def.name} chord, ${display}`}
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

export const CagedSelector = ({
  value,
  onChange,
}: {
  value: CagedSelection;
  onChange: (value: CagedSelection) => void;
}) => (
  <Group label="CAGED position">
    <div style={{ display: 'flex', gap: 3 }}>
      {CAGED_OPTIONS.map((option) => {
        const active = value === option;
        const isShape = option.length === 1;
        return (
          <button
            key={option}
            type="button"
            className="ui-fb-chip"
            data-testid={`fb-caged-${option}`}
            data-active={active}
            aria-pressed={active}
            aria-label={
              isShape ? `${option} shape` : option === 'all' ? 'All shapes' : 'No CAGED overlay'
            }
            onClick={() => onChange(option)}
            style={{
              ...chipButton(active),
              flex: 1,
              padding: '9px 0',
              borderRadius: 6,
              background: active ? 'var(--gold)' : 'var(--card)',
              color: active ? '#fff' : 'var(--ink-2)',
              fontFamily: isShape ? 'var(--serif)' : 'var(--sans)',
              fontSize: isShape ? 15 : 10,
              letterSpacing: isShape ? 0 : '.08em',
              textTransform: isShape ? 'none' : 'uppercase',
            }}
          >
            {option === 'none' ? 'Off' : option === 'all' ? 'All' : option}
          </button>
        );
      })}
    </div>
  </Group>
);
