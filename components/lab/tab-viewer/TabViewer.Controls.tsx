'use client';

import { Button } from '@/components/ui/button';
import { LabeledSelect } from './TabViewer.Selects';
import type { TabViewerActions, TabViewerState } from './useAlphaTab.types';

export type TabViewerLabels = {
  play: string;
  pause: string;
  stop: string;
  speed: string;
  metronome: string;
  countIn: string;
  loop: string;
  track: string;
  zoom: string;
  loading: string;
  playerLoading: string;
};

const SPEEDS = [0.25, 0.5, 0.75, 0.9, 1, 1.25, 1.5];
const SCALES = [0.6, 0.8, 1, 1.2, 1.5];

type Props = { state: TabViewerState; actions: TabViewerActions; labels: TabViewerLabels };

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

function Toggle({ isOn, onClick, children }: { isOn: boolean; onClick: () => void; children: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isOn ? 'default' : 'outline'}
      aria-pressed={isOn}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** The transport and view controls above the score. */
export function TabViewerControls({ state, actions, labels }: Props) {
  const isDisabled = !state.isPlayerReady;
  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar">
      <Button type="button" size="sm" disabled={isDisabled} onClick={actions.playPause}>
        {state.isPlaying ? labels.pause : labels.play}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isDisabled} onClick={actions.stop}>
        {labels.stop}
      </Button>
      <LabeledSelect
        label={labels.speed}
        value={state.speed}
        options={SPEEDS}
        onChange={actions.setSpeed}
        format={percent}
      />
      <Toggle isOn={state.hasMetronome} onClick={actions.toggleMetronome}>
        {labels.metronome}
      </Toggle>
      <Toggle isOn={state.hasCountIn} onClick={actions.toggleCountIn}>
        {labels.countIn}
      </Toggle>
      <Toggle isOn={state.isLooping} onClick={actions.toggleLoop}>
        {labels.loop}
      </Toggle>
      {state.tracks.length > 1 && (
        <LabeledSelect
          label={labels.track}
          value={state.selectedTrack}
          options={state.tracks.map((track) => track.index)}
          onChange={actions.selectTrack}
          format={(index) => state.tracks.find((track) => track.index === index)?.name ?? `#${index + 1}`}
          className="max-w-48"
        />
      )}
      <LabeledSelect
        label={labels.zoom}
        value={state.scale}
        options={SCALES}
        onChange={actions.setScale}
        format={percent}
      />
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {!state.isRendered ? labels.loading : isDisabled ? labels.playerLoading : ''}
      </span>
    </div>
  );
}
