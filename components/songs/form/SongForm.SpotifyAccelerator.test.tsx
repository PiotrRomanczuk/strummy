import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongFormSpotifyAccelerator } from './SongForm.SpotifyAccelerator';

describe('SongFormSpotifyAccelerator', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('searches for a track and calls onAutoFill when selected', async () => {
    const mockOnAutoFill = jest.fn();

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  id: 'track1',
                  name: 'Wonderwall',
                  artist: 'Oasis',
                  duration_ms: 258000,
                  release_date: '1995',
                  coverUrl: 'http://img',
                },
              ],
            }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              key: 4, // E
              mode: 0, // minor -> Em
              tempo: 87,
              time_signature: 4,
            }),
        })
      );

    renderWithIntl(<SongFormSpotifyAccelerator onAutoFill={mockOnAutoFill} />);

    // Type query
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Wonderwall' } });
    
    // Fast forward debounce timer
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Wait for the result to appear
    await waitFor(() => {
      expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    });

    // Click the result
    fireEvent.click(screen.getByText('Wonderwall'));

    // Verify API calls and onAutoFill payload
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockOnAutoFill).toHaveBeenCalledWith({
        title: 'Wonderwall',
        author: 'Oasis',
        spotifyLinkUrl: 'https://open.spotify.com/track/track1',
        coverImageUrl: 'http://img',
        durationMs: 258000,
        releaseYear: 1995,
        key: 'Em',
        tempo: 87,
        timeSignature: 4,
      });
    });
  });
});
