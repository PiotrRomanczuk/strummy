import { useTranslations } from 'next-intl';

import { formatNote, getChordDisplayName, getScaleStepFormula } from '@/lib/music-theory';

import { FRETBOARD_STYLES } from './fretboard.constants';
import { chordDescription, chordName, scaleName } from './fretboard.i18n';
import { Segmented } from './Fretboard.Primitives';
import { sectionLabel } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** Page header: what is on the board right now, and how it is drawn. */
export const FretboardHeader = ({ fb }: { fb: FretboardExplorerApi }) => {
  const t = useTranslations('Fretboard');
  // On the in-app page this line IS the page title. On the free public page the
  // marketing hero above it already owns the h1, and a document with two of
  // them reads as two pages to a crawler and to a screen reader's outline.
  const Title = fb.variant === 'public' ? 'h2' : 'h1';
  const chordDisplay = getChordDisplayName(fb.key, fb.chordKey).replace(
    fb.key,
    formatNote(fb.key, fb.useFlats)
  );

  const subtitle =
    fb.mode === 'scale'
      ? scaleName(t, fb.scaleKey)
      : fb.mode === 'chord'
        ? `${chordName(t, fb.chordKey)} · ${chordDisplay}`
        : t('mode.chromatic');

  const caption =
    fb.mode === 'scale'
      ? t('subhead.scale', {
          count: fb.activeNotes.length,
          formula: getScaleStepFormula(fb.scaleKey),
        })
      : fb.mode === 'chord'
        ? t('subhead.chord', {
            count: fb.activeNotes.length,
            description: chordDescription(t, fb.chordKey),
          })
        : t('subhead.off');

  return (
    <header className="ui-fb-header">
      <div style={{ minWidth: 0 }}>
        <div style={{ ...sectionLabel, letterSpacing: '.16em' }}>{t('eyebrow')}</div>
        <Title
          data-testid="fb-title"
          style={{
            margin: '4px 0 6px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {formatNote(fb.key, fb.useFlats)}{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>{subtitle}</em>
        </Title>
        <p
          data-testid="fb-subhead"
          style={{
            margin: 0,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          {caption}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={sectionLabel}>{t('style.label')}</span>
        <Segmented
          testId="fb-style"
          label={t('style.group')}
          size="sm"
          value={fb.style}
          onChange={fb.setStyle}
          options={FRETBOARD_STYLES.map(({ value }) => ({ value, label: t(`style.${value}`) }))}
        />
      </div>
    </header>
  );
};
