import type { CSSProperties } from "react";
import type { TabColumn, TabDisplay } from "@/lib/types";
import { TabRow } from "./TabRow";

interface Props {
  tab: TabColumn[];
  nextTab?: TabColumn[];
  progress: number;
  tabDisplay: TabDisplay;
  palette: { fg: string; accent: string; muted: string; font: string; card?: string };
}

const POS: Record<TabDisplay["position"], CSSProperties> = {
  inline: {},
  below: { left: 36, right: "auto", top: "auto", bottom: 32 },
  "top-right": { right: 36, top: 36, left: "auto", bottom: "auto" },
  "bottom-left": { left: 36, bottom: 32, top: "auto", right: "auto" },
  "lyrics-strip": {},
  strip: {},
};

// Renders the on-video TAB row in one of the non-inline positions. Inline,
// lyrics-strip, and strip modes are handled directly inside each variation so
// they can share borders / replace the lyric content / span the lower-third.
export function FloatingTab({ tab, nextTab, progress, tabDisplay, palette }: Props) {
  if (tabDisplay.position === "inline" || tabDisplay.position === "lyrics-strip" || tabDisplay.position === "strip") return null;
  return (
    <div style={{
      position: "absolute",
      ...POS[tabDisplay.position],
      background: palette.card ?? "rgba(255,255,255,0.94)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 12px 26px -10px rgba(0,0,0,0.45)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{
        fontFamily: palette.font, fontSize: 10, fontWeight: 700,
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: "rgba(20,20,20,0.55)",
      }}>TAB</div>
      <TabRow
        pattern={tab}
        nextPattern={nextTab}
        progress={progress}
        size={tabDisplay.size}
        palette={palette}
      />
    </div>
  );
}
