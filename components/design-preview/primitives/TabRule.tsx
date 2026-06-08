type TabRuleProps = {
  color?: string;
  strong?: string;
  height?: number;
  padding?: number;
};

export const TabRule = ({
  color = 'var(--rule)',
  strong = 'var(--ink-5)',
  height = 22,
  padding = 0,
}: TabRuleProps) => (
  <svg
    width="100%"
    height={height}
    viewBox={`0 0 100 ${height}`}
    preserveAspectRatio="none"
    style={{ display: 'block', overflow: 'visible', marginTop: padding, marginBottom: padding }}
  >
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const y = (height / 7) * (i + 1);
      const w = i === 0 ? 0.7 : i === 5 ? 0.4 : 0.5;
      const c = i === 0 ? strong : color;
      return (
        <line
          key={i}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke={c}
          strokeWidth={w}
          vectorEffect="non-scaling-stroke"
        />
      );
    })}
  </svg>
);
