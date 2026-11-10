/**
 * Component tests: SongLinkForm — one row of the missing-links queue.
 * A bad link must never reach the server, and a refusal must be shown.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@/app/actions/song-links', () => ({
  saveSongYoutubeLink: jest.fn(),
  markSongWithoutRecording: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { title?: string }) =>
    key === 'linkInputLabel' ? `YouTube link for ${values?.title}` : key,
}));

import { markSongWithoutRecording, saveSongYoutubeLink } from '@/app/actions/song-links';
import { SongLinkForm } from './SongLinkForm';
import { formatDuration, youtubeSearchUrl } from './song-links.helpers';

const SONG_ID = '00000000-1111-4000-a000-000000000001';
const saveMock = saveSongYoutubeLink as jest.Mock;
const markMock = markSongWithoutRecording as jest.Mock;

const setup = () => {
  render(<SongLinkForm songId={SONG_ID} songTitle="1234" />);
  return { user: userEvent.setup(), input: screen.getByLabelText('YouTube link for 1234') };
};

beforeEach(() => {
  saveMock.mockReset().mockResolvedValue({ success: true });
  markMock.mockReset().mockResolvedValue({ success: true });
});

describe('SongLinkForm', () => {
  it('saves a pasted video link, trimmed', async () => {
    const { user, input } = setup();
    await user.type(input, ' https://youtu.be/6pYMZKVZ9Ws ');
    await user.click(screen.getByRole('button', { name: 'linkSave' }));

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(SONG_ID, 'https://youtu.be/6pYMZKVZ9Ws')
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a search-page link from being sent and says why', async () => {
    const { user, input } = setup();
    await user.type(input, 'https://www.youtube.com/results?search_query=feist');
    await user.click(screen.getByRole('button', { name: 'linkSave' }));

    expect(saveMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('invalidYoutubeLink');
  });

  it('cannot save an empty field', () => {
    setup();
    expect(screen.getByRole('button', { name: 'linkSave' })).toBeDisabled();
  });

  it('shows the server refusal', async () => {
    saveMock.mockResolvedValue({ success: false, error: 'linkNotAllowed' });
    const { user, input } = setup();
    await user.type(input, 'https://youtu.be/6pYMZKVZ9Ws');
    await user.click(screen.getByRole('button', { name: 'linkSave' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('linkNotAllowed');
  });

  it('files the entry as an exercise or as other', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'linkMarkExercise' }));
    await waitFor(() => expect(markMock).toHaveBeenCalledWith(SONG_ID, 'exercise'));
    await user.click(screen.getByRole('button', { name: 'linkMarkOther' }));
    await waitFor(() => expect(markMock).toHaveBeenCalledWith(SONG_ID, 'other'));
  });
});

describe('song-links helpers', () => {
  it('builds a YouTube search from author and title', () => {
    expect(youtubeSearchUrl('Lady Pank', 'Mniej niż zero')).toBe(
      'https://www.youtube.com/results?search_query=Lady%20Pank%20Mniej%20ni%C5%BC%20zero'
    );
    expect(youtubeSearchUrl(null, 'Sto lat')).toBe(
      'https://www.youtube.com/results?search_query=Sto%20lat'
    );
  });

  it('formats the Spotify length and leaves a missing one out', () => {
    expect(formatDuration(238000)).toBe('3:58');
    expect(formatDuration(60499)).toBe('1:00');
    expect(formatDuration(null)).toBeNull();
  });
});
