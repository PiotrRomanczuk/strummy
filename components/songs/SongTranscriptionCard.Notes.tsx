import { midiName, notesInBars, type RollTrack } from '@/lib/music-theory/transcription-roll';

type Props = {
  track: RollTrack;
  /** First bar shown and how many. */
  first: number;
  count: number;
  label: string;
};

const WIDTH = 640;
const PAD_LEFT = 30;
const PAD_TOP = 14;
const ROW = 6;

/**
 * The notes of `count` bars as a piano roll: a row per semitone across the track's whole range (so the scale
 * holds while paging), a line per bar with its number, a faint line and a label at every C.
 */
export const TranscriptionNotes = ({ track, first, count, label }: Props) => {
  if (track.low === null || track.high === null) return null;
  const low = track.low - 1;
  const high = track.high + 1;
  const height = PAD_TOP + (high - low + 1) * ROW;
  const innerWidth = WIDTH - PAD_LEFT;
  const xFor = (position: number) => PAD_LEFT + ((position - first) / count) * innerWidth;
  const yFor = (pitch: number) => PAD_TOP + (high - pitch) * ROW;
  const octaves = Array.from({ length: high - low + 1 }, (_, i) => low + i).filter(
    (p) => p % 12 === 0
  );
  const barLines = Array.from({ length: count + 1 }, (_, i) => first + i);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={label}
    >
      {octaves.map((pitch) => (
        <g key={`c-${pitch}`}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH}
            y1={yFor(pitch) + ROW / 2}
            y2={yFor(pitch) + ROW / 2}
            className="stroke-[var(--rule)]"
            strokeWidth={0.6}
          />
          <text x={0} y={yFor(pitch) + ROW} className="fill-[var(--ink-4)] font-mono text-[9px]">
            {midiName(pitch)}
          </text>
        </g>
      ))}
      {barLines.map((bar, i) => (
        <g key={`bar-${bar}`}>
          <line
            x1={xFor(bar)}
            x2={xFor(bar)}
            y1={PAD_TOP - 2}
            y2={height}
            className="stroke-[var(--ink-4)]"
            strokeWidth={i === 0 || i === count ? 0.8 : 0.5}
          />
          {i < count && (
            <text x={xFor(bar) + 3} y={10} className="fill-[var(--ink-4)] font-mono text-[9px]">
              {bar}
            </text>
          )}
        </g>
      ))}
      {notesInBars(track.notes, first, count).map(([start, end, pitch], i) => {
        const x = Math.max(xFor(start), PAD_LEFT);
        const width = Math.max(Math.min(xFor(end), WIDTH) - x, 1.5);
        return (
          <rect
            key={`${start}-${pitch}-${i}`}
            x={x}
            y={yFor(pitch) + 0.5}
            width={width}
            height={ROW - 1}
            rx={1}
            className="fill-[var(--gold-2)]"
          >
            <title>{midiName(pitch)}</title>
          </rect>
        );
      })}
    </svg>
  );
};
