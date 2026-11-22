import type { AlphaTabApi } from '@coderline/alphatab';

import { createTabViewerActions } from './tab-viewer.helpers';
import { INITIAL_STATE, type TabViewerState } from './useAlphaTab.types';

function setup(api: Partial<AlphaTabApi> | null) {
  const apiRef = { current: api as AlphaTabApi | null };
  const stateRef = { current: { ...INITIAL_STATE } };
  const setState = jest.fn((update: (current: TabViewerState) => TabViewerState) => {
    stateRef.current = update(stateRef.current);
  });
  return { actions: createTabViewerActions(apiRef, stateRef, setState), stateRef };
}

describe('createTabViewerActions', () => {
  it('toggleLoop flips the api flag and the state together', () => {
    const api = { isLooping: false } as Partial<AlphaTabApi>;
    const { actions, stateRef } = setup(api);
    actions.toggleLoop();
    expect(api.isLooping).toBe(true);
    expect(stateRef.current.isLooping).toBe(true);
    actions.toggleLoop();
    expect(api.isLooping).toBe(false);
  });

  it('setSpeed still updates the state before the api exists', () => {
    const { actions, stateRef } = setup(null);
    actions.setSpeed(0.5);
    expect(stateRef.current.speed).toBe(0.5);
  });

  it('selectTrack renders the chosen track only', () => {
    const track = { name: 'Bass' };
    const renderTracks = jest.fn();
    const { actions, stateRef } = setup({ score: { tracks: [{}, track] }, renderTracks } as unknown as AlphaTabApi);
    actions.selectTrack(1);
    expect(renderTracks).toHaveBeenCalledWith([track]);
    expect(stateRef.current.selectedTrack).toBe(1);
  });
});
