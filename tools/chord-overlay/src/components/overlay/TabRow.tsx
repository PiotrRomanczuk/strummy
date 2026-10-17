import type { TabColumn, TabSize } from "@/lib/types";

interface Props {
  pattern: TabColumn[];
  // Continuous 0..1 time signal across the active chord. We derive the active
  // column from this so the row stays in sync regardless of column count.
  progress: number;
  palette?: {
    fg?: string;
    accent?: string;
    muted?: string;
    font?: string;
  };
  size?: TabSize;
  // Optional: dimmed preview of the upcoming chord's tab, rendered after the
  // current row with a separator. Caller passes this only when lookahead is on.
  nextPattern?: TabColumn[];
}

const SIZE: Record<TabSize, { cell: number; fontSize: number; labelW: number }> = {
  sm: { cell: 18, fontSize: 11, labelW: 16 },
  md: { cell: 26, fontSize: 14, labelW: 22 },
  lg: { cell: 34, fontSize: 18, labelW: 26 },
};

const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];
const STRING_ORDER = [5, 4, 3, 2, 1, 0];

// 6-string TAB display with a moving playhead cursor instead of a static
// pulse. Each column is one TAB step; the active fret pill highlights and
// a thin vertical line slides across the row to anchor the eye.
export function TabRow({ pattern, progress, palette = {}, size = "md", nextPattern }: Props) {
  const fg = palette.fg ?? "#1a1a1a";
  const accent = palette.accent ?? "oklch(0.62 0.16 35)";
  const muted = palette.muted ?? "rgba(0,0,0,0.18)";
  const font = palette.font ?? "'JetBrains Mono', ui-monospace, monospace";
  const { cell, fontSize, labelW } = SIZE[size];
  const cols = pattern.length;
  const activeIdx = Math.min(cols - 1, Math.max(0, Math.floor(progress * cols)));
  const cursorPx = labelW + progress * (cols * cell) + 2;
  const totalH = cell * 6;
  const showLookahead = !!(nextPattern && nextPattern.length > 0);

  return (
    <div style={{
      position: "relative", display: "inline-block", fontFamily: font, color: fg, height: totalH,
    }}>
      <div style={{
        position: "absolute", top: 0, left: cursorPx, width: 1, height: totalH,
        background: accent, opacity: 0.65, pointerEvents: "none",
        transition: "left 50ms linear",
      }} />
      {STRING_ORDER.map((stringIdx, rowIdx) => (
        <div key={stringIdx} style={{ display: "flex", alignItems: "center", height: cell }}>
          <div style={{
            width: labelW, fontSize: fontSize - 1, fontWeight: 700,
            opacity: 0.55, textAlign: "right", paddingRight: 4,
          }}>{STRING_LABELS[rowIdx]}</div>
          <Cells
            cols={pattern}
            stringIdx={stringIdx}
            activeIdx={activeIdx}
            cell={cell}
            fontSize={fontSize}
            fg={fg}
            accent={accent}
            muted={muted}
          />
          {showLookahead && (
            <>
              <div style={{
                width: cell * 0.6, height: cell, display: "flex",
                alignItems: "center", justifyContent: "center",
                opacity: 0.45, fontSize: fontSize - 2, fontWeight: 700,
              }}>{rowIdx === 0 ? "→" : ""}</div>
              <Cells
                cols={nextPattern!}
                stringIdx={stringIdx}
                activeIdx={-1}
                cell={cell}
                fontSize={fontSize}
                fg={fg}
                accent={accent}
                muted={muted}
                dim
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Cells({
  cols, stringIdx, activeIdx, cell, fontSize, fg, accent, muted, dim,
}: {
  cols: TabColumn[];
  stringIdx: number;
  activeIdx: number;
  cell: number;
  fontSize: number;
  fg: string;
  accent: string;
  muted: string;
  dim?: boolean;
}) {
  return (
    <div style={{ position: "relative", display: "flex", opacity: dim ? 0.45 : 1 }}>
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0, height: 1,
        background: muted, transform: "translateY(-0.5px)",
      }} />
      {cols.map((col, ci) => {
        const v = col[stringIdx];
        const isActive = ci === activeIdx;
        return (
          <div key={ci} style={{
            position: "relative", width: cell, height: cell,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {v != null && (
              <span style={{
                position: "relative", zIndex: 1,
                background: isActive ? accent : "transparent",
                color: isActive ? "#fff" : fg,
                fontWeight: 700, fontSize,
                borderRadius: cell / 2,
                minWidth: cell - 6, height: cell - 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px",
                transition: "background 90ms ease, color 90ms ease, transform 90ms ease",
                transform: isActive ? "scale(1.08)" : "scale(1)",
              }}>{v}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
