'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

import { INITIAL_STATE, type TabViewerActions, type TabViewerState } from './useAlphaTab.types';

type Patch = Partial<TabViewerState>;

type Lifecycle = {
  /** Called as soon as the instance exists, so a cleanup can destroy it synchronously. */
  onCreated: (api: AlphaTabApi) => void;
  isCancelled: () => boolean;
};

/**
 * Mounts alphaTab on `element` and loads the tab. A mount cancelled while alphaTab was still being
 * imported never creates an instance, and a live instance is registered at once — so a dev-mode
 * double mount (or a quick file change) never leaves two instances drawing into one element.
 */
async function mount(
  element: HTMLElement,
  viewport: HTMLElement,
  options: { file: string; assets: string; track: number },
  update: (patch: Patch) => void,
  lifecycle: Lifecycle
): Promise<void> {
  const alphaTab = await import('@coderline/alphatab');
  if (lifecycle.isCancelled()) return;
  const api = new alphaTab.AlphaTabApi(element, {
    core: { fontDirectory: `${options.assets}/font/` },
    player: {
      enablePlayer: true,
      enableCursor: true,
      soundFont: `${options.assets}/soundfont/sonivox.sf2`,
      scrollElement: viewport,
      // Turbopack bundles alphaTab's Web Worker but not its AudioWorklet module.
      outputMode: 'WebAudioScriptProcessor',
    },
  });
  lifecycle.onCreated(api);
  api.scoreLoaded.on((score) => {
    update({ tracks: score.tracks.map((track, index) => ({ index, name: track.name || `#${index + 1}` })) });
  });
  api.renderFinished.on(() => update({ isRendered: true }));
  api.playerReady.on(() => update({ isPlayerReady: true }));
  api.playerStateChanged.on((event) => {
    update({ isPlaying: event.state === alphaTab.synth.PlayerState.Playing });
  });
  api.error.on((error) => update({ error: error.message }));
  const response = await fetch(options.file, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!lifecycle.isCancelled()) api.load(bytes, [options.track]);
}

export function useAlphaTab(fileUrl: string, assetsUrl: string, initialTrack = 0) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const [state, setState] = useState<TabViewerState>({ ...INITIAL_STATE, selectedTrack: initialTrack });
  // Toggles read the latest state without side effects inside setState updaters.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isDisposed = false;
    let api: AlphaTabApi | null = null;
    const update = (patch: Patch) => !isDisposed && setState((current) => ({ ...current, ...patch }));
    if (!containerRef.current || !viewportRef.current) return undefined;
    const lifecycle: Lifecycle = {
      onCreated: (created) => {
        api = created;
        apiRef.current = created;
      },
      isCancelled: () => isDisposed,
    };
    const options = { file: fileUrl, assets: assetsUrl, track: initialTrack };
    mount(containerRef.current, viewportRef.current, options, update, lifecycle).catch((error: unknown) =>
      update({ error: error instanceof Error ? error.message : String(error) })
    );
    return () => {
      isDisposed = true;
      api?.destroy();
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [fileUrl, assetsUrl, initialTrack]);

  const actions = useMemo<TabViewerActions>(() => {
    const withApi = (fn: (api: AlphaTabApi) => void) => () => apiRef.current && fn(apiRef.current);
    const set = (patch: Patch) => setState((current) => ({ ...current, ...patch }));
    return {
      playPause: withApi((api) => api.playPause()),
      stop: withApi((api) => api.stop()),
      setSpeed: (speed) => {
        if (apiRef.current) apiRef.current.playbackSpeed = speed;
        set({ speed });
      },
      toggleMetronome: () => {
        const hasMetronome = !stateRef.current.hasMetronome;
        if (apiRef.current) apiRef.current.metronomeVolume = hasMetronome ? 1 : 0;
        set({ hasMetronome });
      },
      toggleCountIn: () => {
        const hasCountIn = !stateRef.current.hasCountIn;
        if (apiRef.current) apiRef.current.countInVolume = hasCountIn ? 1 : 0;
        set({ hasCountIn });
      },
      toggleLoop: () => {
        const isLooping = !stateRef.current.isLooping;
        if (apiRef.current) apiRef.current.isLooping = isLooping;
        set({ isLooping });
      },
      selectTrack: (index) => {
        const track = apiRef.current?.score?.tracks[index];
        if (apiRef.current && track) apiRef.current.renderTracks([track]);
        set({ selectedTrack: index });
      },
      setScale: (scale) => {
        if (apiRef.current) {
          apiRef.current.settings.display.scale = scale;
          apiRef.current.updateSettings();
          apiRef.current.render();
        }
        set({ scale });
      },
    };
  }, []);

  return { containerRef, viewportRef, state, actions };
}
