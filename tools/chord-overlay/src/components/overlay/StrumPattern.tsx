interface Props {
  pattern: ("D" | "U" | "-")[];
  beat: number;
  palette?: {
    fg?: string;
    accent?: string;
    muted?: string;
    font?: string;
  };
  size?: "sm" | "md";
}

// 8 down/up arrows synced to the active sub-beat. Lifted from the original
// design's StrumPattern component but driven by marker progression instead of
// a BPM clock.
export function StrumPattern({ pattern, beat, palette = {}, size = "md" }: Props) {
  const fg = palette.fg ?? "#1a1a1a";
  const accent = palette.accent ?? "oklch(0.62 0.16 35)";
  const muted = palette.muted ?? "rgba(0,0,0,0.25)";
  const font = palette.font ?? "'JetBrains Mono', ui-monospace, monospace";
  const arrowSize = size === "sm" ? 16 : 22;
  const dotSize = size === "sm" ? 3 : 4;
  const gap = size === "sm" ? 6 : 10;

  return (
    <div style={{ display: "flex", alignItems: "center", gap, fontFamily: font }}>
      {pattern.map((s, i) => {
        const isActive = i === beat;
        const isRest = s === "-";
        const arrow = s === "D" ? "↓" : s === "U" ? "↑" : "·";
        return (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            opacity: isRest ? 0.35 : 1,
          }}>
            <div style={{
              fontSize: arrowSize, lineHeight: 1, fontWeight: 700,
              color: isActive ? accent : fg,
              transform: isActive ? "scale(1.25)" : "scale(1)",
              transition: "transform 90ms ease, color 90ms ease",
            }}>{arrow}</div>
            <div style={{
              width: dotSize, height: dotSize, borderRadius: dotSize / 2,
              background: isActive ? accent : (i % 2 === 0 ? fg : muted),
              opacity: isActive ? 1 : 0.45,
            }} />
          </div>
        );
      })}
    </div>
  );
}
