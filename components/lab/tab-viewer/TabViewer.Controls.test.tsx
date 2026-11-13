import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TabViewerControls } from './TabViewer.Controls';
import { INITIAL_STATE, type TabViewerActions } from './useAlphaTab.types';

const LABELS = {
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  speed: 'Speed',
  metronome: 'Metronome',
  countIn: 'Count-in',
  loop: 'Loop',
  track: 'Track',
  zoom: 'Zoom',
  loading: 'Rendering…',
  playerLoading: 'Loading the sounds…',
};

function actions(): jest.Mocked<TabViewerActions> {
  return {
    playPause: jest.fn(),
    stop: jest.fn(),
    setSpeed: jest.fn(),
    toggleMetronome: jest.fn(),
    toggleCountIn: jest.fn(),
    toggleLoop: jest.fn(),
    selectTrack: jest.fn(),
    setScale: jest.fn(),
  };
}

describe('TabViewerControls', () => {
  it('keeps the transport off until the player is ready', () => {
    render(<TabViewerControls state={INITIAL_STATE} actions={actions()} labels={LABELS} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByText('Rendering…')).toBeInTheDocument();
  });

  it('drives the player once ready', () => {
    const spy = actions();
    const state = {
      ...INITIAL_STATE,
      isRendered: true,
      isPlayerReady: true,
      isPlaying: true,
      hasMetronome: true,
      tracks: [
        { index: 0, name: 'Vocals' },
        { index: 1, name: 'Guitar' },
      ],
    };
    render(<TabViewerControls state={state} actions={spy} labels={LABELS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(spy.playPause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Metronome' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Loop' }));
    expect(spy.toggleLoop).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '0.5' } });
    expect(spy.setSpeed).toHaveBeenCalledWith(0.5);
    fireEvent.change(screen.getByLabelText('Track'), { target: { value: '1' } });
    expect(spy.selectTrack).toHaveBeenCalledWith(1);
  });

  it('hides the track picker for a single-track tab', () => {
    render(<TabViewerControls state={{ ...INITIAL_STATE, tracks: [{ index: 0, name: 'Guitar' }] }} actions={actions()} labels={LABELS} />);
    expect(screen.queryByLabelText('Track')).not.toBeInTheDocument();
  });
});
