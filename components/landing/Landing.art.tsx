/** Decorative five-line musical stave. */
export const StaffLines = ({
  height = 40,
  color = 'var(--rule)',
  strokeWidth = 0.7,
  count = 5,
}: {
  height?: number;
  color?: string;
  strokeWidth?: number;
  count?: number;
}) => (
  <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
    {Array.from({ length: count }).map((_, i) => (
      <line
        key={i}
        x1="0"
        y1={(height * (i + 1)) / (count + 1)}
        x2="100"
        y2={(height * (i + 1)) / (count + 1)}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    ))}
  </svg>
);

/** Decorative fretboard strip (used behind the final CTA band). */
export const FretboardArt = ({
  frets = 24,
  height = 110,
  color = 'var(--ink)',
}: {
  frets?: number;
  height?: number;
  color?: string;
}) => {
  const strings = 6;
  return (
    <svg
      viewBox={`0 0 ${frets * 40} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block' }}
    >
      <rect
        x="0"
        y="2"
        width={frets * 40}
        height={height - 4}
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        opacity=".35"
      />
      {Array.from({ length: frets + 1 }).map((_, i) => (
        <line
          key={i}
          x1={i * 40}
          y1="2"
          x2={i * 40}
          y2={height - 2}
          stroke={color}
          strokeWidth={i === 0 ? 1.5 : 0.5}
          opacity={i === 0 ? 0.9 : 0.4}
        />
      ))}
      {Array.from({ length: strings }).map((_, i) => (
        <line
          key={`s${i}`}
          x1="0"
          y1={4 + ((height - 8) * i) / (strings - 1)}
          x2={frets * 40}
          y2={4 + ((height - 8) * i) / (strings - 1)}
          stroke={color}
          strokeWidth="0.5"
          opacity=".5"
        />
      ))}
      {[3, 5, 7, 9].map((f) => (
        <circle key={f} cx={f * 40 - 20} cy={height / 2} r="2" fill={color} opacity=".5" />
      ))}
      <circle cx={12 * 40 - 25} cy={height / 2 - 8} r="2" fill={color} opacity=".5" />
      <circle cx={12 * 40 - 15} cy={height / 2 + 8} r="2" fill={color} opacity=".5" />
    </svg>
  );
};
