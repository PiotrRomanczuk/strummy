import type { TabColumn } from "@/lib/types";

interface Props {
  bars: TabColumn[][];
  currentBar: number;
  // 0..1 progress through the active bar
  barProgress: number;
  palette?: {
    fg?: string;
    accent?: string;
    muted?: string;
    label?: string;
    bg?: string;
    font?: string;
  };
}

const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];
const STRING_ORDER = [5, 4, 3, 2, 1, 0];
const COL_W = 28;
const ROW_H = 22;
const LABEL_W = 44;
// Keep the playhead anchored ~120 px in from the visible left edge so the
// upcoming bars stay visible while past notes scroll out.
const STAGE_OFFSET = 120;

export function TabStrip({ bars, currentBar, barProgress, palette = {} }: Props) {
  const fg = palette.fg ?? "#1a1a1a";
  const accent = palette.accent ?? "oklch(0.62 0.16 35)";
  const muted = palette.muted ?? "rgba(0,0,0,0.18)";
  const label = palette.label ?? "rgba(0,0,0,0.55)";
  const bg = palette.bg ?? "#fff";
  const font = palette.font ?? "'JetBrains Mono', ui-monospace, monospace";

  if (!bars.length) return null;

  const safeBar = Math.max(0, Math.min(currentBar, bars.length - 1));
  const totalCols = bars.reduce((sum, b) => sum + b.length, 0);
  const stripW = totalCols * COL_W + 60;

  let colsBefore = 0;
  for (let i = 0; i < safeBar; i++) colsBefore += bars[i].length;
  const currentCols = bars[safeBar].length;
  const cursorColX = colsBefore + Math.max(0, Math.min(1, barProgress)) * currentCols;
  const translateX = -cursorColX * COL_W + STAGE_OFFSET;

  const dividers: number[] = [];
  let acc = 0;
  for (let i = 0; i < bars.length; i++) {
    dividers.push(acc);
    acc += bars[i].length;
  }
  dividers.push(acc);

  return (
    <div style={{
      width: "100%", overflow: "hidden",
      fontFamily: font, color: fg, position: "relative",
    }}>
      <div style={{ position: "absolute", left: 0, top: 6, width: LABEL_W, zIndex: 2 }}>
        {STRING_ORDER.map((s, idx) => (
          <div key={s} style={{
            height: ROW_H, lineHeight: `${ROW_H}px`,
            fontSize: 11, fontWeight: 700, color: label,
            textAlign: "right", paddingRight: 8,
          }}>{STRING_LABELS[idx]}</div>
        ))}
      </div>

      <div style={{
        marginLeft: LABEL_W, position: "relative",
        overflow: "hidden", paddingTop: 6,
      }}>
        <div style={{
          position: "absolute", top: 6,
          left: STAGE_OFFSET, width: 1, height: ROW_H * 6,
          background: accent, opacity: 0.65,
          zIndex: 1, pointerEvents: "none",
        }} />

        <div style={{
          width: stripW,
          transform: `translateX(${translateX}px)`,
          transition: "transform 220ms cubic-bezier(.4,0,.2,1)",
          position: "relative",
        }}>
          {STRING_ORDER.map((s, idx) => (
            <div key={`l${s}`} style={{
              position: "absolute",
              left: 0, right: 0,
              top: idx * ROW_H + ROW_H / 2,
              height: 1, background: muted,
            }} />
          ))}

          {dividers.map((c, i) => (
            <div key={`bd${i}`} style={{
              position: "absolute",
              left: c * COL_W,
              top: 0, height: ROW_H * 6,
              width: 1, background: muted,
            }} />
          ))}

          <div style={{ position: "relative", height: ROW_H * 6 }}>
            {bars.map((bar, bi) => {
              const barOffset = dividers[bi];
              const isActiveBar = bi === safeBar;
              const activeCol = isActiveBar
                ? Math.min(bar.length - 1, Math.max(0, Math.floor(barProgress * bar.length)))
                : -1;
              return bar.flatMap((col, ci) => col.map((fret, sIdx) => {
                if (fret == null) return null;
                const isActive = ci === activeCol && isActiveBar;
                const xidx = barOffset + ci;
                const yidx = STRING_ORDER.indexOf(sIdx);
                return (
                  <div key={`n${bi}-${ci}-${sIdx}`} style={{
                    position: "absolute",
                    left: xidx * COL_W + COL_W / 2,
                    top: yidx * ROW_H + ROW_H / 2,
                    transform: `translate(-50%, -50%) ${isActive ? "scale(1.18)" : "scale(1)"}`,
                    background: isActive ? accent : bg,
                    color: isActive ? "#fff" : fg,
                    border: `1.5px solid ${isActive ? accent : fg}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: 12, fontWeight: 700, lineHeight: 1.1,
                    transition: "transform 120ms ease, background 120ms ease, color 120ms ease",
                    boxShadow: isActive ? `0 0 0 3px ${accent}33` : "none",
                  }}>{fret}</div>
                );
              }));
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
