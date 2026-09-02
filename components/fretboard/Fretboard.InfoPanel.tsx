import { useTranslations } from 'next-intl';

import {
  formatNote,
  getIntervalName,
  getScaleStepFormula,
  getSemitoneDistance,
  SCALE_DEFINITIONS,
  type NoteName,
} from '@/lib/music-theory';

import { chordDescription, scaleDescription } from './fretboard.i18n';
import { MiniCAGED } from './MiniCAGED';
import { sectionLabel } from './fretboard.styles';
import type { FretboardExplorerApi } from './useFretboardExplorer';

/** Right rail: the notes behind the overlay — tones, formula, CAGED windows. */
export const FretboardInfoPanel = ({ fb }: { fb: FretboardExplorerApi }) => {
  const t = useTranslations('Fretboard');
  const scale = fb.mode === 'scale' ? SCALE_DEFINITIONS[fb.scaleKey] : undefined;
  const description =
    fb.mode === 'scale'
      ? scaleDescription(t, fb.scaleKey)
      : fb.mode === 'chord'
        ? chordDescription(t, fb.chordKey)
        : t('info.chromaticAbout');

  return (
    <aside
      data-testid="fb-info"
      style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}
    >
      <div>
        <div style={sectionLabel}>{fb.mode === 'chord' ? t('chord.tones') : t('scale.notes')}</div>
        <div
          data-testid="fb-info-notes"
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
          }}
        >
          {fb.activeNotes.map((note, i) => (
            <NoteChip
              key={`${note}-${i}`}
              note={note}
              isRoot={note === fb.key}
              interval={getIntervalName(getSemitoneDistance(fb.key, note))}
              useFlats={fb.useFlats}
            />
          ))}
          {fb.activeNotes.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: 16,
                color: 'var(--ink-4)',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {t('info.empty')}
            </div>
          )}
        </div>
      </div>

      {scale && <ScaleFormula intervals={scale.intervals} scaleKey={fb.scaleKey} />}

      <CagedPositions fb={fb} />

      <div>
        <div style={sectionLabel}>{t('info.about')}</div>
        <p
          data-testid="fb-info-description"
          style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}
        >
          {description}
        </p>
      </div>
    </aside>
  );
};

const CagedPositions = ({ fb }: { fb: FretboardExplorerApi }) => {
  const t = useTranslations('Fretboard');
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={sectionLabel}>{t('caged.positions')}</div>
        <span
          data-testid="fb-caged-count"
          style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}
        >
          {t('caged.shapeCount', { count: fb.cagedPositions.length })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {fb.cagedPositions.map((position) => {
          const active = fb.caged === position.shape;
          return (
            <button
              key={position.shape}
              type="button"
              className="ui-fb-chip"
              data-testid={`fb-caged-card-${position.shape}`}
              data-active={active}
              aria-pressed={active}
              onClick={() => fb.setCaged(active ? 'none' : position.shape)}
              style={{
                border: active ? '1px solid var(--gold-2)' : '1px solid var(--rule)',
                background: active ? 'var(--gold-tint)' : 'var(--card)',
                borderRadius: 8,
                padding: 4,
                cursor: 'pointer',
              }}
            >
              <MiniCAGED position={position} board={fb.board} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ScaleFormula = ({ intervals, scaleKey }: { intervals: number[]; scaleKey: string }) => {
  const t = useTranslations('Fretboard');
  return (
    <div>
      <div style={sectionLabel}>{t('info.formula')}</div>
      <div
        data-testid="fb-scale-formula"
        style={{
          marginTop: 8,
          fontFamily: 'var(--mono)',
          fontSize: 12,
          color: 'var(--ink-2)',
          lineHeight: 1.7,
        }}
      >
        <div>{intervals.map((i) => getIntervalName(i)).join(' – ')}</div>
        <div style={{ color: 'var(--ink-4)' }}>{getScaleStepFormula(scaleKey)}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, lineHeight: 1.4 }}>
        {t.rich('info.stepLegend', {
          w: (chunks) => <em style={{ fontFamily: 'var(--serif)' }}>{chunks}</em>,
          h: (chunks) => <em style={{ fontFamily: 'var(--serif)' }}>{chunks}</em>,
        })}
      </div>
    </div>
  );
};

const NoteChip = ({
  note,
  isRoot,
  interval,
  useFlats,
}: {
  note: NoteName;
  isRoot: boolean;
  interval: string;
  useFlats: boolean;
}) => (
  <div
    data-testid="fb-note-chip"
    style={{
      padding: '10px 4px',
      background: isRoot ? 'var(--gold)' : 'var(--card)',
      border: isRoot ? '1px solid var(--gold-2)' : '1px solid var(--rule)',
      borderRadius: 6,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '.08em',
        color: isRoot ? 'rgba(255,255,255,.75)' : 'var(--ink-4)',
      }}
    >
      {interval}
    </div>
    <div
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 20,
        fontWeight: 500,
        marginTop: 2,
        color: isRoot ? '#fff' : 'var(--ink)',
      }}
    >
      {formatNote(note, useFlats)}
    </div>
  </div>
);
