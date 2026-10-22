import type { Project, TabColumn } from "@/lib/types";
import { frameAt } from "./overlayState";
import { CleanVariation } from "./CleanVariation";
import { NotebookVariation } from "./NotebookVariation";
import { ChyronVariation } from "./ChyronVariation";

interface Props {
  project: Project;
  time: number;
}

export function Overlay({ project, time }: Props) {
  const sorted = [...project.markers].sort((a, b) => a.time - b.time);
  const frame = frameAt(project, time, sorted);
  const tab = frame.current?.marker.tab;
  const nextTab = project.tabDisplay.lookahead ? frame.next?.marker.tab : undefined;

  const tabbed = sorted.filter((m) => m.tab && m.tab.length > 0);
  const bars: TabColumn[][] = tabbed.map((m) => m.tab!);
  let currentBar = -1;
  for (let i = 0; i < tabbed.length; i++) {
    if (tabbed[i].time <= time) currentBar = i;
    else break;
  }
  if (currentBar < 0) currentBar = 0;
  const barProgress = frame.current && tabbed[currentBar]?.id === frame.current.marker.id
    ? frame.subBeatFraction
    : 1;

  const common = {
    frame,
    watermark: project.watermark,
    capo: project.capoDisplay,
    bpm: project.bpmDisplay,
    strum: project.strum,
    elements: project.elements,
    tab,
    nextTab,
    tabDisplay: project.tabDisplay,
    bars,
    currentBar,
    barProgress,
  };
  if (project.variation === "notebook") return <NotebookVariation {...common} />;
  if (project.variation === "chyron") return <ChyronVariation {...common} />;
  return <CleanVariation {...common} />;
}
