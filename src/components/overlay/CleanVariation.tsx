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

const palette = {
  fg: "#141414",
  card: "rgba(255,255,255,0.96)",
  accent: "oklch(0.62 0.16 35)",
  muted: "rgba(20,20,20,0.18)",
  font: "'JetBrains Mono', ui-monospace, monospace",
};

export function CleanVariation({
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
        position: "absolute", top: 36, left: 36, width: 460,
        background: palette.card, borderRadius: 12,
        padding: "20px 22px 16px",
        boxShadow: "0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.18)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8,
        }}>
          <div style={{
            fontFamily: palette.font, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(20,20,20,0.55)",
          }}>NOW PLAYING</div>
          <div style={{
            fontFamily: palette.font, fontSize: 12, fontWeight: 700,
            color: palette.accent, letterSpacing: "0.06em",
          }}>● LIVE</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            fontSize: 96, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.04em",
            color: palette.fg, minWidth: 160,
          }}>{current?.chord ?? "—"}</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            {current && (
              <ChordDiagram voicing={current.voicing} size={140} palette={{
                line: palette.fg, dot: palette.fg, dotText: "#fff", mute: palette.fg, font: palette.font,
              }} />
            )}
          </div>
        </div>

        {elements.strum && (
          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${palette.muted}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          }}>
            <div style={{
              fontFamily: palette.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(20,20,20,0.5)",
            }}>STRUM</div>
            <StrumPattern pattern={strum} beat={subBeat} palette={{
              fg: palette.fg, accent: palette.accent, muted: palette.muted, font: palette.font,
            }} />
          </div>
        )}

        {elements.tab && tab && tabInline && (
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${palette.muted}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          }}>
            <div style={{
              fontFamily: palette.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(20,20,20,0.5)",
            }}>TAB</div>
            <TabRow
              pattern={tab}
              nextPattern={nextTab}
              progress={subBeatFraction}
              size={tabDisplay.size}
              palette={{
                fg: palette.fg, accent: palette.accent, muted: palette.muted, font: palette.font,
              }}
            />
          </div>
        )}

        {(elements.next || elements.meta) && (
          <div style={{
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${palette.muted}`,
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            fontFamily: palette.font, fontSize: 12, fontWeight: 700,
            color: "rgba(20,20,20,0.55)", letterSpacing: "0.10em",
          }}>
            <span>{elements.next ? <>NEXT · <span style={{ color: palette.accent }}>{next?.chord ?? "—"}</span></> : ""}</span>
            <span>
              {elements.meta && (
                <>
                  {capo != null && capo > 0 ? `CAPO ${capo}` : "CAPO 0"}
                  {bpm != null && bpm > 0 ? ` · ♩ ${bpm}` : ""}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {tabInStrip && (
        <div style={{
          position: "absolute", left: 36, right: 36, bottom: 28,
          background: palette.card, borderRadius: 8,
          padding: "10px 16px 14px",
          boxShadow: "0 12px 30px -10px rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 4,
          }}>
            <div style={{
              fontFamily: palette.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "rgba(20,20,20,0.55)",
            }}>TAB · 4/4{bpm != null && bpm > 0 ? ` · ♩ = ${bpm}` : ""}</div>
            <div style={{
              fontFamily: palette.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.12em", color: "rgba(20,20,20,0.55)",
            }}>
              {capo != null && capo > 0 ? `Capo ${capo} · ` : ""}Standard tuning
            </div>
          </div>
          <TabStrip
            bars={bars}
            currentBar={currentBar}
            barProgress={barProgress}
            palette={{
              fg: palette.fg, accent: palette.accent, muted: palette.muted,
              bg: "#fff", label: "rgba(20,20,20,0.55)", font: palette.font,
            }}
          />
        </div>
      )}

      {!tabInStrip && (elements.lyrics || tabInLyricStrip) && (
        <div style={{
          position: "absolute", left: 36, right: 36, bottom: 32,
          background: palette.card, borderRadius: 10,
          padding: "14px 22px 16px",
          boxShadow: "0 14px 32px -10px rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}>
          {tabInLyricStrip ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                fontFamily: palette.font, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "rgba(20,20,20,0.55)", minWidth: 80,
              }}>{current?.chord ?? "—"} · TAB</div>
              <TabRow
                pattern={tab!}
                nextPattern={nextTab}
                progress={subBeatFraction}
                size={tabDisplay.size}
                palette={{
                  fg: palette.fg, accent: palette.accent, muted: palette.muted, font: palette.font,
                }}
              />
            </div>
          ) : lyricWindow.map((row) => (
            <div key={row.idx} style={{
              display: "flex", alignItems: "baseline", gap: 14,
              opacity: row.active ? 1 : 0.32, padding: "3px 0",
              transition: "opacity 200ms ease",
            }}>
              <div style={{
                fontFamily: palette.font, fontSize: row.active ? 22 : 16,
                fontWeight: 800, color: row.active ? palette.accent : palette.fg,
                minWidth: 80, letterSpacing: "0.02em",
              }}>{row.chord}</div>
              <div style={{
                fontSize: row.active ? 30 : 20, fontWeight: row.active ? 700 : 500,
                color: palette.fg, lineHeight: 1.1,
              }}>{row.lyric || "·"}</div>
            </div>
          ))}
        </div>
      )}

      {elements.tab && tab && !tabInline && !tabInLyricStrip && !tabInStrip && (
        <FloatingTab
          tab={tab}
          nextTab={nextTab}
          progress={subBeatFraction}
          tabDisplay={tabDisplay}
          palette={{
            fg: palette.fg, accent: palette.accent, muted: palette.muted,
            font: palette.font, card: palette.card,
          }}
        />
      )}

      {elements.watermark && (
        <div style={{
          position: "absolute", right: 40, top: 40,
          fontFamily: palette.font, fontSize: 13, fontWeight: 600,
          color: "#141414", background: "rgba(255,255,255,0.85)",
          padding: "6px 10px", borderRadius: 4,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          letterSpacing: "0.02em",
        }}>{watermark}</div>
      )}
    </div>
  );
}
