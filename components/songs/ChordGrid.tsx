import { useTranslations } from 'next-intl';

import { voicingForChord } from '@/lib/music-theory/chord-voicing-lookup';
import type { ChordVoicing } from '@/lib/music-theory/chord-voicings';

import { ChordGridFrame, ChordGridNoShape } from './ChordGrid.Frame';
import { boxFor, rowY, stringX, type ChordGridBox as Box } from './chord-grid.helpers';

type ChordGridProps = {
  name: string;
  size?: number;
  color?: string;
};

/** Open circles and mute crosses above the nut. */
const StringMarks = ({
  box,
  voicing,
  color,
}: {
  box: Box;
  voicing: ChordVoicing;
  color: string;
}) => (
  <>
    {voicing.frets.map((fret, i) => {
      if (fret !== null && fret > 0) return null;
      const x = stringX(box, i);
      const y = box.top - 5;
      const r = box.size * 0.05;
      return fret === 0 ? (
        <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth="1" />
      ) : (
        <path
          key={i}
          d={`M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`}
          stroke={color}
          strokeWidth="1"
          opacity=".6"
        />
      );
    })}
  </>
);

/** Barre and finger dots, placed relative to the voicing's base fret. */
const Fingering = ({ box, voicing, color }: { box: Box; voicing: ChordVoicing; color: string }) => {
  const row = (fret: number) => fret - voicing.baseFret + 1;
  const { barre } = voicing;
  return (
    <>
      {barre && (
        <line
          x1={stringX(box, barre.fromString)}
          y1={rowY(box, row(barre.fret))}
          x2={stringX(box, barre.toString)}
          y2={rowY(box, row(barre.fret))}
          stroke={color}
          strokeWidth={box.size * 0.12}
          strokeLinecap="round"
        />
      )}
      {voicing.frets.map((fret, i) =>
        fret === null || fret === 0 ? null : (
          <circle
            key={i}
            cx={stringX(box, i)}
            cy={rowY(box, row(fret))}
            r={box.size * 0.08}
            fill={color}
          />
        )
      )}
    </>
  );
};

/** A small chord box for a chord symbol as the song writes it; a dashed box when there is no shape. */
export const ChordGrid = ({ name, size = 48, color = 'var(--ink-2)' }: ChordGridProps) => {
  const t = useTranslations('Skills');
  const tCard = useTranslations('SongCard');
  const voicing = voicingForChord(name);
  const box = boxFor(size);
  const height = size * 1.28;
  const viewBox = `0 0 ${size} ${height}`;

  // The consuming card labels each chord itself, so the SVG draws only the
  // grid — an in-SVG name would duplicate (and clip against) that label.
  if (!voicing) {
    return (
      <svg
        width={size}
        height={height}
        viewBox={viewBox}
        className="block"
        role="img"
        aria-label={`${name}: ${tCard('noShape')}`}
      >
        <ChordGridNoShape box={box} color={color} label={tCard('noShape')} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={height}
      viewBox={viewBox}
      className="block"
      role="img"
      aria-label={t('diagramAriaLabel', { name: voicing.name })}
      data-voicing={voicing.id}
    >
      <ChordGridFrame box={box} baseFret={voicing.baseFret} color={color} />
      <StringMarks box={box} voicing={voicing} color={color} />
      <Fingering box={box} voicing={voicing} color={color} />
    </svg>
  );
};
