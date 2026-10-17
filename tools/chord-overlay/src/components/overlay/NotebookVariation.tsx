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
  fg: "#22201c",
  paper: "oklch(0.96 0.012 85)",
  paperEdge: "oklch(0.88 0.018 80)",
  accent: "oklch(0.55 0.16 30)",
  ink: "#1a1814",
  muted: "rgba(34,32,28,0.22)",
  font: "'JetBrains Mono', ui-monospace, monospace",
  hand: "'Caveat', 'Patrick Hand', cursive",
};

const paperBg = `${p.paper} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.13 0 0 0 0 0.12 0 0 0 0 0.10 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export function NotebookVariation({
  frame, watermark, capo, bpm, strum, elements, tab, nextTab, tabDisplay,
  bars, currentBar, barProgress,
}: Props) {
  const { current, next, lyricWindow, subBeat, subBeatFraction } = frame;
  const tabInline = tabDisplay.position === "inline";
  const tabInLyricStrip = tabDisplay.position === "lyrics-strip" && !!(elements.tab && tab);
  const tabInStrip = tabDisplay.position === "strip" && !!(elements.tab && bars.length > 0);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{
        position: "absolute", top: 50, left: 44, width: 460,
        transform: "rotate(-1.2deg)",
        filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.35))",
      }}>
        <div style={{
          position: "absolute", top: -14, left: 30, width: 100, height: 24,
          background: "oklch(0.85 0.10 80 / 0.85)",
          transform: "rotate(-6deg)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }} />
        <div style={{
          position: "absolute", top: -10, right: 28, width: 86, height: 22,
          background: "oklch(0.82 0.09 25 / 0.85)",
          transform: "rotate(7deg)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }} />

        <div style={{
          background: paperBg, backgroundSize: "auto, 160px 160px",
          border: `1px solid ${p.paperEdge}`, borderRadius: 3,
          padding: "22px 24px 18px",
          fontFamily: p.font, color: p.ink,
        }}>
          <div style={{
            fontFamily: p.hand, fontSize: 24, fontWeight: 700, lineHeight: 1,
            color: p.accent, marginBottom: 6,
          }}>now playing —</div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              fontFamily: p.hand, fontSize: 110, fontWeight: 700, lineHeight: 0.85,
              color: p.ink, letterSpacing: "-0.02em",
            }}>{current?.chord ?? "—"}</div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              {current && (
                <ChordDiagram voicing={current.voicing} size={140} palette={{
                  line: p.ink, dot: p.ink, dotText: p.paper, mute: p.ink, font: p.font,
                }} />
              )}
            </div>
          </div>

          {elements.strum && (
            <div style={{
              borderTop: `1.5px dashed ${p.muted}`, marginTop: 12, paddingTop: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ fontFamily: p.hand, fontSize: 18, color: p.accent, fontWeight: 700 }}>strum →</div>
              <StrumPattern pattern={strum} beat={subBeat} palette={{
                fg: p.ink, accent: p.accent, muted: p.muted, font: p.font,
              }} size="sm" />
            </div>
          )}

          {elements.tab && tab && tabInline && (
            <div style={{
              borderTop: `1.5px dashed ${p.muted}`, marginTop: 8, paddingTop: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ fontFamily: p.hand, fontSize: 18, color: p.accent, fontWeight: 700 }}>tab →</div>
              <TabRow
                pattern={tab}
                nextPattern={nextTab}
                progress={subBeatFraction}
                size={tabDisplay.size}
                palette={{ fg: p.ink, accent: p.accent, muted: p.muted, font: p.font }}
              />
            </div>
          )}

          {(elements.next || elements.meta) && (
            <div style={{
              marginTop: 8, paddingTop: 6, borderTop: `1px dashed ${p.muted}`,
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              fontFamily: p.hand, fontSize: 18, color: p.accent, fontWeight: 700,
            }}>
              <span>{elements.next ? <>next → <span style={{ color: p.ink }}>{next?.chord ?? "—"}</span></> : ""}</span>
              <span style={{ fontFamily: p.font, fontSize: 11, color: "rgba(34,32,28,0.7)" }}>
                {elements.meta && (
                  <>
                    {capo != null && capo > 0 ? `capo ${capo}` : "capo 0"}
                    {bpm != null && bpm > 0 ? ` · ♩ ${bpm}` : ""}
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {tabInStrip && (
        <div style={{
          position: "absolute", left: 28, right: 28, bottom: 22,
          background: paperBg, backgroundSize: "auto, 160px 160px",
          padding: "12px 22px 16px", fontFamily: p.font, color: p.ink,
          clipPath: "polygon(0 8px, 1.5% 4px, 3% 7px, 4.5% 3px, 6% 6px, 7.5% 2px, 9% 7px, 10.5% 4px, 12% 8px, 13.5% 3px, 15% 6px, 17% 4px, 19% 7px, 21% 3px, 23% 6px, 25% 4px, 27% 7px, 29% 3px, 31% 6px, 33% 4px, 35% 7px, 37% 3px, 39% 6px, 41% 4px, 43% 7px, 45% 3px, 47% 6px, 49% 4px, 51% 7px, 53% 3px, 55% 6px, 57% 4px, 59% 7px, 61% 3px, 63% 6px, 65% 4px, 67% 7px, 69% 3px, 71% 6px, 73% 4px, 75% 7px, 77% 3px, 79% 6px, 81% 4px, 83% 7px, 85% 3px, 87% 6px, 89% 4px, 91% 7px, 93% 3px, 95% 6px, 97% 4px, 99% 7px, 100% 4px, 100% 100%, 0 100%)",
          boxShadow: "0 -8px 18px rgba(0,0,0,0.18)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 6,
          }}>
            <div style={{ fontFamily: p.hand, fontSize: 22, color: p.accent, fontWeight: 700 }}>
              tab — fingerstyle
            </div>
            <div style={{
              fontFamily: p.font, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.1em", color: "rgba(34,32,28,0.6)",
            }}>
              {bpm != null && bpm > 0 ? `♩ = ${bpm}` : ""}
              {capo != null && capo > 0 ? ` · capo ${capo}` : ""}
            </div>
          </div>
          <TabStrip
            bars={bars}
            currentBar={currentBar}
            barProgress={barProgress}
            palette={{
              fg: p.ink, accent: p.accent, muted: p.muted,
              bg: p.paper, label: "rgba(34,32,28,0.6)", font: p.font,
            }}
          />
        </div>
      )}

      {!tabInStrip && (elements.lyrics || tabInLyricStrip) && (
        <div style={{
          position: "absolute", left: 28, right: 28, bottom: 22,
          background: paperBg, backgroundSize: "auto, 160px 160px",
          padding: "14px 24px 18px", fontFamily: p.hand, color: p.ink,
          clipPath: "polygon(0 8px, 1.5% 4px, 3% 7px, 4.5% 3px, 6% 6px, 7.5% 2px, 9% 7px, 10.5% 4px, 12% 8px, 13.5% 3px, 15% 6px, 17% 4px, 19% 7px, 21% 3px, 23% 6px, 25% 4px, 27% 7px, 29% 3px, 31% 6px, 33% 4px, 35% 7px, 37% 3px, 39% 6px, 41% 4px, 43% 7px, 45% 3px, 47% 6px, 49% 4px, 51% 7px, 53% 3px, 55% 6px, 57% 4px, 59% 7px, 61% 3px, 63% 6px, 65% 4px, 67% 7px, 69% 3px, 71% 6px, 73% 4px, 75% 7px, 77% 3px, 79% 6px, 81% 4px, 83% 7px, 85% 3px, 87% 6px, 89% 4px, 91% 7px, 93% 3px, 95% 6px, 97% 4px, 99% 7px, 100% 4px, 100% 100%, 0 100%)",
          boxShadow: "0 -8px 18px rgba(0,0,0,0.18)",
        }}>
          {tabInLyricStrip ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                fontFamily: p.hand, fontSize: 22, fontWeight: 700,
                color: p.accent, minWidth: 96,
              }}>{current?.chord ?? "—"} tab →</div>
              <TabRow
                pattern={tab!}
                nextPattern={nextTab}
                progress={subBeatFraction}
                size={tabDisplay.size}
                palette={{ fg: p.ink, accent: p.accent, muted: p.muted, font: p.font }}
              />
            </div>
          ) : lyricWindow.map((row) => (
            <div key={row.idx} style={{
              display: "flex", alignItems: "baseline", gap: 14,
              opacity: row.active ? 1 : 0.4, padding: "3px 0",
            }}>
              <div style={{
                fontFamily: p.font, fontSize: row.active ? 20 : 14, fontWeight: 700,
                color: row.active ? p.accent : p.ink, minWidth: 76,
              }}>{row.chord}</div>
              <div style={{
                fontFamily: p.hand, fontSize: row.active ? 36 : 22,
                fontWeight: 700, color: p.ink, lineHeight: 1.05,
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
            fg: p.ink, accent: p.accent, muted: p.muted, font: p.font, card: p.paper,
          }}
        />
      )}

      {elements.watermark && (
        <div style={{
          position: "absolute", right: 44, top: 44, transform: "rotate(3deg)",
          fontFamily: p.hand, fontSize: 22, fontWeight: 700, color: p.ink,
          background: "oklch(0.95 0.02 85)", border: `1px dashed ${p.ink}`,
          padding: "6px 12px", boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
        }}>{watermark}</div>
      )}
    </div>
  );
}
