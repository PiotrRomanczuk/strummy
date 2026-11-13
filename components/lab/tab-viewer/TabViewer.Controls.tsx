'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const SELECT = 'h-8 rounded-md border bg-background px-2 text-sm dark:bg-input/30';

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
      <label className="flex items-center gap-1 text-sm">
        {labels.speed}
        <select
          className={SELECT}
          value={state.speed}
          onChange={(event) => actions.setSpeed(Number(event.target.value))}
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>{`${Math.round(speed * 100)}%`}</option>
          ))}
        </select>
      </label>
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
        <label className="flex items-center gap-1 text-sm">
          {labels.track}
          <select
            className={cn(SELECT, 'max-w-48')}
            value={state.selectedTrack}
            onChange={(event) => actions.selectTrack(Number(event.target.value))}
          >
            {state.tracks.map((track) => (
              <option key={track.index} value={track.index}>
                {track.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex items-center gap-1 text-sm">
        {labels.zoom}
        <select
          className={SELECT}
          value={state.scale}
          onChange={(event) => actions.setScale(Number(event.target.value))}
        >
          {SCALES.map((scale) => (
            <option key={scale} value={scale}>{`${Math.round(scale * 100)}%`}</option>
          ))}
        </select>
      </label>
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {!state.isRendered ? labels.loading : isDisabled ? labels.playerLoading : ''}
      </span>
    </div>
  );
}
