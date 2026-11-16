import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderServerTree } from '@/lib/testing/intl-test-utils';
import {
  getSongTranscription,
  type SongTranscriptionView,
} from '@/lib/services/song-transcription-queries';

import { SongTranscriptionCard } from './SongTranscriptionCard';

jest.mock('@/lib/services/song-transcription-queries', () => ({
  getSongTranscription: jest.fn(),
}));

const mockedGet = jest.mocked(getSongTranscription);

const VIEW: SongTranscriptionView = {
  recordingUrl: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  transcribedOn: '2026-11-15',
  bars: 20,
  bass: {
    notes: [
      [1, 1.5, 40],
      [2, 2.25, 43],
      [9.2, 9.6, 45],
    ],
    low: 40,
    high: 45,
  },
  vocals: { notes: [], low: null, high: null },
};

describe('SongTranscriptionCard', () => {
  beforeEach(() => mockedGet.mockReset());

  it('draws the bass line eight bars at a time and links the transcribed recording', async () => {
    mockedGet.mockResolvedValue(VIEW);
    const { container } = await renderServerTree(<SongTranscriptionCard songId="song-1" />);

    expect(mockedGet).toHaveBeenCalledWith('song-1');
    expect(screen.getByText('Bass line & melody')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bass' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vocals' })).toBeDisabled(); // no vocal notes
    expect(screen.getByText('Bars 1–8 of 20')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bass: notes in bars 1–8 of 20' })).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Previous bars' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next bars' }));
    expect(screen.getByText('Bars 9–16 of 20')).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(1);
    expect(container.querySelector('rect title')?.textContent).toBe('A2');

    fireEvent.click(screen.getByRole('button', { name: 'Next bars' }));
    expect(screen.getByText('Bars 17–20 of 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next bars' })).toBeDisabled();

    expect(
      screen.getByRole('link', { name: 'Transcribed recording (2026-11-15)' })
    ).toHaveAttribute('href', VIEW.recordingUrl);
  });

  it('starts on the vocals when the song has no bass', async () => {
    mockedGet.mockResolvedValue({
      ...VIEW,
      bass: { notes: [], low: null, high: null },
      vocals: { notes: [[1, 2, 64]], low: 64, high: 64 },
    });
    await renderServerTree(<SongTranscriptionCard songId="song-1" />);
    expect(screen.getByRole('button', { name: 'Vocals' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('img', { name: 'Vocals: notes in bars 1–8 of 20' })
    ).toBeInTheDocument();
  });

  it.each([
    ['no transcription', null],
    ['no bass and no vocal notes', { ...VIEW, bass: { notes: [], low: null, high: null } }],
  ])('renders nothing with %s', async (_, view) => {
    mockedGet.mockResolvedValue(view);
    const { container } = await renderServerTree(<SongTranscriptionCard songId="song-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
