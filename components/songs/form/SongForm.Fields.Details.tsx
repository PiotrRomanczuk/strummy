'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import { Field } from './Field';
import { filled, songMonoInput } from './song-form.styles';

const toNumberOrNull = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const stepBtn: CSSProperties = {
  width: 28,
  height: 28,
  flexShrink: 0,
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  borderRadius: 8,
  cursor: 'pointer',
  color: 'var(--ink-3)',
};

type Props = {
  capoFret: number | null;
  tempo: number | null;
  timeSignature: number | null;
  releaseYear: number | null;
  onCapoFret: (v: number | null) => void;
  onTempo: (v: number | null) => void;
  onTimeSignature: (v: number | null) => void;
  onReleaseYear: (v: number | null) => void;
};

/** Section III · Musical, first row — capo stepper, tempo, meter, release year. */
export const SongFormFieldsDetails = (p: Props) => {
  const t = useTranslations('Songs');
  const numberField = (
    name: string,
    value: number | null,
    onChange: (v: number | null) => void,
    placeholder: string,
    range: [number, number]
  ) => (
    <input
      name={name}
      type="number"
      min={range[0]}
      max={range[1]}
      placeholder={placeholder}
      style={filled(songMonoInput, value !== null)}
      value={value ?? ''}
      onChange={(e) => onChange(toNumberOrNull(e.target.value))}
    />
  );

  return (
    <div className="ui-form-row-4" style={{ gap: 16, marginBottom: 16 }}>
      <Field label={t('formLabelCapoFret')} hint="0–20">
        <input type="hidden" name="capo_fret" value={p.capoFret ?? ''} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            style={stepBtn}
            aria-label={t('formDecreaseCapoFretAria')}
            onClick={() => p.onCapoFret(Math.max(0, (p.capoFret ?? 0) - 1))}
          >
            −
          </button>
          <div
            aria-live="polite"
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'var(--serif)',
              fontSize: 22,
              fontWeight: 500,
              padding: '3px 0',
              background: p.capoFret ? 'var(--gold-tint)' : 'var(--card)',
              border: `1px solid ${p.capoFret ? 'var(--gold-dim)' : 'var(--rule)'}`,
              borderRadius: 8,
              color: p.capoFret ? 'var(--gold-2)' : 'var(--ink-4)',
            }}
          >
            {p.capoFret ?? 0}
          </div>
          <button
            type="button"
            style={stepBtn}
            aria-label={t('formIncreaseCapoFretAria')}
            onClick={() => p.onCapoFret(Math.min(20, (p.capoFret ?? 0) + 1))}
          >
            +
          </button>
        </div>
      </Field>
      <Field label={t('formLabelTempo')}>
        {numberField('tempo', p.tempo, p.onTempo, '120', [0, 300])}
      </Field>
      <Field label={t('formLabelTimeSignature')}>
        {numberField('time_signature', p.timeSignature, p.onTimeSignature, '4', [1, 16])}
      </Field>
      <Field label={t('formLabelReleaseYear')}>
        {numberField('release_year', p.releaseYear, p.onReleaseYear, '2024', [1500, 2100])}
      </Field>
    </div>
  );
};
