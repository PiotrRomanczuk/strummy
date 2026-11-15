'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

import { createTabViewerActions } from './tab-viewer.helpers';
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
      playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
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
    // The hub parsed the file with another library: its track index may not exist here.
    if (score.tracks.length > 0 && options.track >= score.tracks.length) {
      api.renderTracks([score.tracks[0]]);
      update({ selectedTrack: 0 });
    }
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

  // The refs are only read lazily, inside event handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const actions = useMemo<TabViewerActions>(() => createTabViewerActions(apiRef, stateRef, setState), []);

  return { containerRef, viewportRef, state, actions };
}
