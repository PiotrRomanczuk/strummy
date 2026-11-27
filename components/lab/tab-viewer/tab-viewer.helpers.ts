import type { MutableRefObject } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

import type { TabViewerActions, TabViewerState } from './useAlphaTab.types';

type SetState = (update: (current: TabViewerState) => TabViewerState) => void;

/**
 * The transport and view actions of the viewer. They read the live api and the latest state through
 * refs, so one instance serves the whole life of the hook and toggles run no side effects inside a
 * state updater.
 */
export function createTabViewerActions(
  apiRef: MutableRefObject<AlphaTabApi | null>,
  stateRef: MutableRefObject<TabViewerState>,
  setState: SetState
): TabViewerActions {
  const withApi = (fn: (api: AlphaTabApi) => void) => () => {
    const api = apiRef.current;
    if (api) fn(api);
  };
  const set = (patch: Partial<TabViewerState>) => setState((current) => ({ ...current, ...patch }));
  return {
    playPause: withApi((api) => api.playPause()),
    stop: withApi((api) => api.stop()),
    setSpeed: (speed) => {
      const api = apiRef.current;
      if (api) api.playbackSpeed = speed;
      set({ speed });
    },
    toggleMetronome: () => {
      const hasMetronome = !stateRef.current.hasMetronome;
      const api = apiRef.current;
      if (api) api.metronomeVolume = hasMetronome ? 1 : 0;
      set({ hasMetronome });
    },
    toggleCountIn: () => {
      const hasCountIn = !stateRef.current.hasCountIn;
      const api = apiRef.current;
      if (api) api.countInVolume = hasCountIn ? 1 : 0;
      set({ hasCountIn });
    },
    toggleLoop: () => {
      const isLooping = !stateRef.current.isLooping;
      const api = apiRef.current;
      if (api) api.isLooping = isLooping;
      set({ isLooping });
    },
    selectTrack: (index) => {
      const api = apiRef.current;
      const track = api?.score?.tracks[index];
      if (api && track) api.renderTracks([track]);
      set({ selectedTrack: index });
    },
    setScale: (scale) => {
      const api = apiRef.current;
      if (api) {
        api.settings.display.scale = scale;
        api.updateSettings();
        api.render();
      }
      set({ scale });
    },
  };
}
