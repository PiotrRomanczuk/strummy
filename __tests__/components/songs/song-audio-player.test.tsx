/**
 * SongAudioPlayer — renders nothing when the song has no audio_files, and
 * toggles play/pause when it does. No waveform assertions: this player is
 * deliberately a real <audio> element with transport controls, not a
 * waveform renderer (see components/songs/SongAudioPlayer.tsx).
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongAudioPlayer } from '@/components/songs/SongAudioPlayer';

describe('SongAudioPlayer', () => {
  it('renders nothing when audio_files is null', () => {
    const { container } = renderWithIntl(<SongAudioPlayer audioFiles={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when audio_files is an empty object', () => {
    const { container } = renderWithIntl(<SongAudioPlayer audioFiles={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the player when audio_files has a url', () => {
    renderWithIntl(
      <SongAudioPlayer audioFiles={{ backing_track: 'https://example.com/track.mp3' }} />
    );

    expect(screen.getByTestId('song-audio-player')).toBeInTheDocument();
  });

  it('toggles the play/pause button label on play and pause events', () => {
    renderWithIntl(
      <SongAudioPlayer audioFiles={{ backing_track: 'https://example.com/track.mp3' }} />
    );

    const audio = screen
      .getByTestId('song-audio-player')
      .querySelector('audio') as HTMLAudioElement;
    const toggle = screen.getByTestId('audio-play-toggle');

    fireEvent.play(audio);
    expect(toggle).toHaveAccessibleName(/pause/i);

    fireEvent.pause(audio);
    expect(toggle).toHaveAccessibleName(/play/i);
  });
});
