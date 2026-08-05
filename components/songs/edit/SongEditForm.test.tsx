import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongEditForm } from './SongEditForm';

jest.mock('@/app/actions/song-edit', () => ({
  updateSongAction: jest.fn(),
}));

jest.mock('../form/SongForm.SpotifyAccelerator', () => ({
  SongFormSpotifyAccelerator: ({ onAutoFill }: any) => (
    <button
      data-testid="mock-autofill"
      onClick={() =>
        onAutoFill({
          title: 'Auto Title',
          author: 'Auto Author',
          spotifyLinkUrl: 'https://open.spotify.com/track/123',
          coverImageUrl: 'https://img.co/123',
          durationMs: 120000,
          releaseYear: 1999,
          key: 'Bm',
          tempo: 140,
          timeSignature: 4,
        })
      }
    >
      Mock AutoFill
    </button>
  ),
}));

const song = {
  id: 's1',
  title: 'Wonderwall',
  author: 'Oasis',
  level: 'intermediate',
  key: 'Em',
  capo_fret: 2,
  tempo: 87,
  chords: 'Em7 G Dsus4 A7sus4 Cadd9',
  lyrics_with_chords: '[Em7]Today is [G]gonna be the day',
};

describe('SongEditForm', () => {
  it('pre-fills every field from the song prop', () => {
    renderWithIntl(<SongEditForm song={song} />);
    expect(screen.getByRole('heading', { name: 'Edit Wonderwall' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Wonderwall')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Oasis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('87')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Em7 G Dsus4 A7sus4 Cadd9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('updates the live preview as title/author/level/key change', () => {
    renderWithIntl(<SongEditForm song={song} />);
    fireEvent.change(screen.getByDisplayValue('Wonderwall'), {
      target: { value: 'Wonderwall (Acoustic)' },
    });
    expect(screen.getByText('Wonderwall (Acoustic)')).toBeInTheDocument();
  });

  it('submits the hidden song id alongside the form action', () => {
    renderWithIntl(<SongEditForm song={song} />);
    expect(document.querySelector('input[type="hidden"][name="id"]')).toHaveValue('s1');
  });

  it('applies auto-fill data from Spotify search', () => {
    renderWithIntl(<SongEditForm song={song} />);
    fireEvent.click(screen.getByTestId('mock-autofill'));
    expect(screen.getByDisplayValue('Auto Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Auto Author')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1999')).toBeInTheDocument(); // Release year
    expect(screen.getByDisplayValue('140')).toBeInTheDocument(); // Tempo
  });
});
