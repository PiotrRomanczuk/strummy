'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatNote } from '@/lib/music-theory';

import { chordName, scaleName } from './fretboard.i18n';
import { sectionLabel } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

type Props = { fb: FretboardExplorerApi; isOpen: boolean; onToggle: () => void };

/** Phone header from the mobile mockup: what is on the neck, plus a Controls toggle. */
export const FretboardMobileBar = ({ fb, isOpen, onToggle }: Props) => {
  const t = useTranslations('Fretboard');
  const subtitle =
    fb.mode === 'scale'
      ? scaleName(t, fb.scaleKey)
      : fb.mode === 'chord'
        ? chordName(t, fb.chordKey)
        : t('mode.chromatic');
  return (
    <div className="ui-fb-mobilebar md:hidden">
      <div style={{ minWidth: 0 }}>
        <div style={{ ...sectionLabel, letterSpacing: '.16em' }}>{t('mobile.eyebrow')}</div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 22,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          {formatNote(fb.key, fb.useFlats)} <em style={{ color: 'var(--gold-2)' }}>{subtitle}</em>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          background: 'var(--card)',
          fontSize: 13,
          color: 'var(--ink-2)',
          whiteSpace: 'nowrap',
        }}
      >
        {isOpen ? <X size={13} /> : <SlidersHorizontal size={13} />}{' '}
        {isOpen ? t('mobile.done') : t('mobile.controls')}
      </button>
    </div>
  );
};

/** Phone-only "Notes" row: the active tones as tiles, root in gold. */
export const FretboardMobileNotes = ({ fb }: { fb: FretboardExplorerApi }) => {
  const t = useTranslations('Fretboard');
  if (fb.activeNotes.length === 0) return null;
  return (
    <div className="md:hidden" aria-hidden="true">
      <div style={{ ...sectionLabel, marginBottom: 8 }}>{t('mobile.notes')}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(fb.activeNotes.length, 7)}, 1fr)`,
          gap: 4,
        }}
      >
        {fb.activeNotes.map((note, i) => {
          const isRoot = note === fb.key;
          return (
            <div
              key={`${note}-${i}`}
              style={{
                padding: '10px 0',
                textAlign: 'center',
                borderRadius: 6,
                fontFamily: 'var(--serif)',
                fontSize: 18,
                background: isRoot ? 'var(--gold)' : 'var(--card)',
                border: `1px solid ${isRoot ? 'var(--gold-2)' : 'var(--rule)'}`,
                color: isRoot ? '#fff' : 'var(--ink)',
              }}
            >
              {formatNote(note, fb.useFlats)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
