'use client';

import { TabViewerControls, type TabViewerLabels } from './TabViewer.Controls';
import { useAlphaTab } from './useAlphaTab';

type Props = {
  /** The admin-only route that streams the Guitar Pro file. */
  fileUrl: string;
  /** The admin-only route that serves alphaTab's font and soundfont. */
  assetsUrl: string;
  /** The track shown first (the first guitar part, not a vocal line). */
  initialTrack?: number;
  labels: TabViewerLabels & { error: string };
};

/** alphaTab: the score as notation + tablature, played back with a soundfont, cursor following. */
export function TabViewer({ fileUrl, assetsUrl, initialTrack = 0, labels }: Props) {
  const { containerRef, viewportRef, state, actions } = useAlphaTab(fileUrl, assetsUrl, initialTrack);
  return (
    <div className="space-y-3">
      <TabViewerControls state={state} actions={actions} labels={labels} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {labels.error}: {state.error}
        </p>
      )}
      {/* alphaTab draws black notation, so the sheet stays light in dark mode too. */}
      <div
        ref={viewportRef}
        className="max-h-[75vh] overflow-auto rounded-md border bg-white text-black dark:border-input dark:bg-neutral-100"
      >
        <div ref={containerRef} data-testid="alphatab-score" />
      </div>
    </div>
  );
}
