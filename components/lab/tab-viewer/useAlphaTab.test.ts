import { act, renderHook, waitFor } from '@testing-library/react';

import { useAlphaTab } from './useAlphaTab';

type Handler = (value?: unknown) => void;

const created: FakeApi[] = [];

class Emitter {
  handlers: Handler[] = [];
  on(handler: Handler) {
    this.handlers.push(handler);
  }
  emit(value?: unknown) {
    this.handlers.forEach((handler) => handler(value));
  }
}

class FakeApi {
  scoreLoaded = new Emitter();
  renderFinished = new Emitter();
  playerReady = new Emitter();
  playerStateChanged = new Emitter();
  error = new Emitter();
  load = jest.fn();
  destroy = jest.fn();
  playPause = jest.fn();
  metronomeVolume = 0;
  constructor(
    public host: HTMLElement,
    public settings: unknown
  ) {
    created.push(this);
  }
}

jest.mock('@coderline/alphatab', () => ({
  AlphaTabApi: jest.fn((host: HTMLElement, settings: unknown) => new FakeApi(host, settings)),
  synth: { PlayerState: { Paused: 0, Playing: 1 } },
}));

function mountHook() {
  const container = document.createElement('div');
  const viewport = document.createElement('div');
  return renderHook(() => {
    const hook = useAlphaTab('/file', '/assets', 2);
    hook.containerRef.current ??= container;
    hook.viewportRef.current ??= viewport;
    return hook;
  });
}

beforeEach(() => {
  created.length = 0;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(3) });
});

describe('useAlphaTab', () => {
  it('fetches the tab and loads it on its own host with the Lab asset routes', async () => {
    const { result, rerender } = mountHook();
    rerender();
    await waitFor(() => expect(created.at(-1)?.load).toHaveBeenCalled());
    const api = created.at(-1) as FakeApi;
    expect(global.fetch).toHaveBeenCalledWith('/file', { credentials: 'same-origin' });
    expect(api.settings).toMatchObject({
      core: { fontDirectory: '/assets/font/' },
      player: { soundFont: '/assets/soundfont/sonivox.sf2', outputMode: 'WebAudioScriptProcessor' },
    });
    expect(api.load).toHaveBeenCalledWith(expect.any(Uint8Array), [2]);
    act(() => api.scoreLoaded.emit({ tracks: [{ name: 'Vocals' }, { name: '' }] }));
    expect(result.current.state.tracks).toEqual([
      { index: 0, name: 'Vocals' },
      { index: 1, name: '#2' },
    ]);
    act(() => api.playerStateChanged.emit({ state: 1 }));
    expect(result.current.state.isPlaying).toBe(true);
  });

  it('reports a failed download and destroys the player on unmount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 });
    const { result, rerender, unmount } = mountHook();
    rerender();
    await waitFor(() => expect(result.current.state.error).toBe('HTTP 403'));
    unmount();
    created.forEach((api) => expect(api.destroy).toHaveBeenCalled());
  });
});
