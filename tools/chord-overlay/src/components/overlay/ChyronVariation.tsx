import { ChordDiagram } from "./ChordDiagram";
import { StrumPattern } from "./StrumPattern";
import { TabRow } from "./TabRow";
import { TabStrip } from "./TabStrip";
import { FloatingTab } from "./FloatingTab";
import type { OverlayFrame } from "./overlayState";
import type { ElementToggles, StrumStep, TabColumn, TabDisplay } from "@/lib/types";

interface Props {
  frame: OverlayFrame;
  watermark: string;
  capo?: number;
  bpm?: number;
  strum: StrumStep[];
  elements: ElementToggles;
  tab?: TabColumn[];
  nextTab?: TabColumn[];
  tabDisplay: TabDisplay;
  bars: TabColumn[][];
  currentBar: number;
  barProgress: number;
}

const p = {
  fg: "#f5f1ea",
  bg: "#0d0c0a",
  accent: "oklch(0.78 0.17 78)",
  muted: "rgba(245,241,234,0.18)",
  font: "'JetBrains Mono', ui-monospace, monospace",
};

export function ChyronVariation({
  frame, watermark, capo, bpm, strum, elements, tab, nextTab, tabDisplay,
  bars, currentBar, barProgress,
}: Props) {
  const { current, next, lyricWindow, subBeat, subBeatFraction } = frame;
  const tabInline = tabDisplay.position === "inline";
  const tabInLyricStrip = tabDisplay.position === "lyrics-strip" && !!(elements.tab && tab);
  const tabInStrip = tabDisplay.position === "strip" && !!(elements.tab && bars.length > 0);

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{
        position: "absolute", top: 36, right: 36,
        display: "flex", gap: 0,
        boxShadow: "0 14px 30px -10px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          background: p.bg, padding: "14px 16px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          borderRight: `2px solid ${p.accent}`,
        }}>
          <div style={{
            fontFamily: p.font, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.18em", color: p.accent,
          }}>NOW PLAYING</div>
          {current && (
            <ChordDiagram voicing={current.voicing} size={130} palette={{
              line: p.fg, dot: p.accent, dotText: p.bg, mute: p.fg, font: p.font,
            }} />
          )}
        </div>
        <div style={{
          background: p.bg, padding: "14px 22px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          minWidth: 160, color: p.fg,
        }}>
          {elements.meta && (
            <div style={{
              fontFamily: p.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.18em", color: "rgba(245,241,234,0.55)",
            }}>
              {capo != null && capo > 0 ? `CAPO ${capo}` : "CAPO 0"}
              {bpm != null && bpm > 0 ? ` · ♩ ${bpm}` : ""}
            </div>
          )}
          <div style={{
            fontWeight: 900, fontSize: 96, lineHeight: 0.85,
            color: p.fg, letterSpacing: "-0.05em",
          }}>{current?.chord ?? "—"}</div>
          {elements.next && (
            <div style={{
              fontFamily: p.font, fontSize: 11, fontWeight: 700,
              color: "rgba(245,241,234,0.55)", letterSpacing: "0.08em",
            }}>NEXT · <span style={{ color: p.accent }}>{next?.chord ?? "—"}</span></div>
          )}
        </div>
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: p.bg, color: p.fg, fontFamily: p.font,
        boxShadow: "0 -12px 30px rgba(0,0,0,0.5)",
      }}>
        <div style={{ height: 4, background: p.accent }} />
        {(elements.strum || elements.meta || (elements.tab && tab && tabInline)) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 24,
            padding: "10px 28px", borderBottom: `1px solid ${p.muted}`,
          }}>
            {elements.strum && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                  color: "rgba(245,241,234,0.55)",
                }}>STRUM</div>
                <StrumPattern pattern={strum} beat={subBeat} palette={{
                  fg: p.fg, accent: p.accent, muted: p.muted, font: p.font,
                }} size="sm" />
              </>
            )}
            {elements.tab && tab && tabInline && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                  color: "rgba(245,241,234,0.55)",
                }}>TAB</div>
                <TabRow
                  pattern={tab}
                  nextPattern={nextTab}
                  progress={subBeatFraction}
                  size={tabDisplay.size}
                  palette={{ fg: p.fg, accent: p.accent, muted: p.muted, font: p.font }}
                />
              </>
            )}
            <div style={{ flex: 1 }} />
            {elements.meta && (
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                color: "rgba(245,241,234,0.55)", display: "flex", gap: 18,
              }}>
                {bpm != null && bpm > 0 && <span>♩ = {bpm}</span>}
                <span>4/4</span>
                {capo != null && capo > 0 && <span>CAPO {capo}</span>}
                <span>STD TUNING</span>
              </div>
            )}
          </div>
        )}
        {tabInStrip && (
          <div style={{ padding: "12px 28px 16px" }}>
            <TabStrip
              bars={bars}
              currentBar={currentBar}
              barProgress={barProgress}
              palette={{
                fg: p.fg, accent: p.accent, muted: p.muted, bg: p.bg,
                label: "rgba(245,241,234,0.55)", font: p.font,
              }}
            />
          </div>
        )}
        {!tabInStrip && (elements.lyrics || tabInLyricStrip) && (
          <div style={{ padding: "14px 28px 18px" }}>
            {tabInLyricStrip ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{
                  fontFamily: p.font, fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.18em", color: p.accent, minWidth: 80,
                }}>{current?.chord ?? "—"} · TAB</div>
                <TabRow
                  pattern={tab!}
                  nextPattern={nextTab}
                  progress={subBeatFraction}
                  size={tabDisplay.size}
                  palette={{ fg: p.fg, accent: p.accent, muted: p.muted, font: p.font }}
                />
              </div>
            ) : lyricWindow.map((row) => (
              <div key={row.idx} style={{
                display: "flex", alignItems: "baseline", gap: 14,
                opacity: row.active ? 1 : 0.35, padding: "2px 0",
              }}>
                <div style={{
                  fontFamily: p.font, fontSize: row.active ? 22 : 15, fontWeight: 700,
                  color: row.active ? p.accent : p.fg, minWidth: 80, letterSpacing: "0.04em",
                }}>{row.chord}</div>
                <div style={{
                  fontSize: row.active ? 28 : 18, fontWeight: row.active ? 700 : 500,
                  color: p.fg, lineHeight: 1.1,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>{row.lyric || "·"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {elements.tab && tab && !tabInline && !tabInLyricStrip && !tabInStrip && (
        <FloatingTab
          tab={tab}
          nextTab={nextTab}
          progress={subBeatFraction}
          tabDisplay={tabDisplay}
          palette={{
            fg: p.fg, accent: p.accent, muted: p.muted, font: p.font, card: p.bg,
          }}
        />
      )}

      {elements.watermark && (
        <div style={{
          position: "absolute", left: 36, top: 36,
          fontFamily: p.font, fontSize: 13, fontWeight: 700,
          color: p.bg, background: p.accent,
          padding: "6px 10px", borderRadius: 4,
          letterSpacing: "0.04em",
        }}>{watermark}</div>
      )}
    </div>
  );
}
