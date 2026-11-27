import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { createSongExercise } from '@/app/actions/song-exercises';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongCardSaveExercise } from './SongCardView.SaveExercise';

jest.mock('@/app/actions/song-exercises', () => ({ createSongExercise: jest.fn() }));

const props = {
  songId: '62a9c235-aed2-4912-a78b-0f079079ac92',
  videoId: 'bO28lB1uwp4',
  partN: 2,
  defaultName: 'Chorus – Come Together',
  rate: 0.6,
  source: 'backing' as const,
};

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Save as exercise' }));

describe('SongCardSaveExercise', () => {
  beforeEach(() => jest.mocked(createSongExercise).mockReset());

  it('is off when no part is selected', () => {
    renderWithIntl(<SongCardSaveExercise {...props} partN={null} />);
    expect(screen.getByRole('button', { name: 'Save as exercise' })).toBeDisabled();
  });

  it('opens with the name prefilled and saves the part at the card tempo and source', async () => {
    jest.mocked(createSongExercise).mockResolvedValue({ exerciseId: 'e1' });
    renderWithIntl(<SongCardSaveExercise {...props} />);
    open();
    expect(screen.getByLabelText('Name')).toHaveValue('Chorus – Come Together');
    expect(screen.getByText(/Part 2 at 60% tempo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Strumming' }));
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'wrist' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Saved/));
    expect(createSongExercise).toHaveBeenCalledWith({
      songId: props.songId,
      videoId: 'bO28lB1uwp4',
      partN: 2,
      name: 'Chorus – Come Together',
      kind: 'strum',
      tempoPercent: 60,
      source: 'backing',
      note: 'wrist',
    });
  });

  it('says so on a duplicate name and clears the message when the name changes', async () => {
    jest.mocked(createSongExercise).mockResolvedValue({ error: 'duplicate' });
    renderWithIntl(<SongCardSaveExercise {...props} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already has an exercise/);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Other' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a failure and does not save an empty name', async () => {
    jest.mocked(createSongExercise).mockResolvedValue({ error: 'failed' });
    renderWithIntl(<SongCardSaveExercise {...props} defaultName="" />);
    open();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Riff' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/);
  });
});
