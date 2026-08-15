'use client';

import { useTranslations } from 'next-intl';

import { LEVEL_LABEL_KEYS } from '@/components/shared/level-label.helpers';
import { LYRICS_MAX_LENGTH } from '@/schemas/CommonSchema';

import type { UltimateGuitarDraft } from './ultimate-guitar.types';

const rowLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  minWidth: 92,
};
const rowValueStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 13,
  color: 'var(--ink)',
  overflowWrap: 'anywhere',
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '3px 0' }}>
    <span style={rowLabelStyle}>{label}</span>
    <span style={rowValueStyle}>{value}</span>
  </div>
);

/** Shows exactly what a parse recognised, so nothing is applied unseen. */
export const SongFormUltimateGuitarImportSummary = ({ draft }: { draft: UltimateGuitarDraft }) => {
  const t = useTranslations('Songs');
  const tabLines = draft.lyricsWithChords?.split('\n').length ?? 0;
  // Surfaced here rather than at save time: applying an over-long tab used to
  // succeed silently and then fail validation on submit, after the paste box
  // had already been cleared.
  const isTabOverLimit = (draft.lyricsWithChords?.length ?? 0) > LYRICS_MAX_LENGTH;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--gold-2)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          marginBottom: 6,
        }}
      >
        {t('ugImportFoundHeading')}
      </div>
      {draft.title && <Row label={t('formLabelTitle')} value={draft.title} />}
      {draft.author && <Row label={t('formLabelAuthor')} value={draft.author} />}
      {draft.level && (
        <Row label={t('formLabelDifficulty')} value={t(LEVEL_LABEL_KEYS[draft.level])} />
      )}
      {draft.key && <Row label={t('formLabelKey')} value={draft.key} />}
      {draft.capoFret !== undefined && (
        <Row
          label={t('formLabelCapoFret')}
          value={draft.capoFret === 0 ? t('ugImportCapoNone') : String(draft.capoFret)}
        />
      )}
      {draft.chords.length > 0 && (
        <Row label={t('ugImportFieldChords')} value={draft.chords.join('  ')} />
      )}
      {tabLines > 0 && (
        <Row label={t('ugImportFieldTab')} value={t('ugImportTabLines', { count: tabLines })} />
      )}
      {isTabOverLimit && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--danger)',
            fontFamily: 'var(--sans)',
          }}
        >
          {t('ugImportTabTooLong', { max: LYRICS_MAX_LENGTH.toLocaleString() })}
        </div>
      )}
      {draft.ultimateGuitarLink && (
        <Row label={t('formLabelUltimateGuitar')} value={draft.ultimateGuitarLink} />
      )}
    </div>
  );
};
