/**
 * Component tests: WantToLearnButton
 *
 * The control a student uses to put a library song into their own repertoire.
 * What matters here is that it never offers an action the database would
 * refuse, and that a refusal surfaces instead of silently appearing to work.
 *
 * @see components/songs/WantToLearnButton.tsx
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@/app/actions/repertoire', () => ({
  addSongToMyRepertoireAction: jest.fn(),
  removeSongFromMyRepertoireAction: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      wantToLearnAdd: 'Want to learn',
      wantToLearnRemove: 'Remove',
      wantToLearnPending: 'Saving…',
      wantToLearnInRepertoire: 'In your repertoire',
    })[key] ?? key,
}));

import {
  addSongToMyRepertoireAction,
  removeSongFromMyRepertoireAction,
} from '@/app/actions/repertoire';
import { WantToLearnButton } from './WantToLearnButton';

const SONG_ID = '00000000-1111-4000-a000-000000000001';
const addMock = addSongToMyRepertoireAction as jest.Mock;
const removeMock = removeSongFromMyRepertoireAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  addMock.mockResolvedValue({ success: true });
  removeMock.mockResolvedValue({ success: true });
});

describe('WantToLearnButton', () => {
  it('offers the add action when the song is not in the repertoire', () => {
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'absent' }} />);
    expect(screen.getByRole('button', { name: 'Want to learn' })).toBeInTheDocument();
  });

  it('adds the song and flips to the remove affordance', async () => {
    const user = userEvent.setup();
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'absent' }} />);

    await user.click(screen.getByRole('button', { name: 'Want to learn' }));

    expect(addMock).toHaveBeenCalledWith(SONG_ID);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument());
  });

  it('removes the song and returns to the add affordance', async () => {
    const user = userEvent.setup();
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'added-removable' }} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removeMock).toHaveBeenCalledWith(SONG_ID);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Want to learn' })).toBeInTheDocument()
    );
  });

  // A locked entry is teacher-assigned, started, or practised. Rendering a
  // button there would promise an undo the RPC refuses.
  it('renders a locked entry as static text, not a button', () => {
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'added-locked' }} />);

    expect(screen.getByText('In your repertoire')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('surfaces the action error and keeps the original affordance', async () => {
    const user = userEvent.setup();
    addMock.mockResolvedValue({ error: 'Could not add this song right now' });
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'absent' }} />);

    await user.click(screen.getByRole('button', { name: 'Want to learn' }));

    await waitFor(() =>
      expect(screen.getByText('Could not add this song right now')).toBeInTheDocument()
    );
    // Still offering "Want to learn" — a failed add must not look like a success.
    expect(screen.getByRole('button', { name: 'Want to learn' })).toBeInTheDocument();
  });

  it('does not fire a second request while one is in flight', async () => {
    const user = userEvent.setup();
    let resolve: (v: { success: true }) => void = () => {};
    addMock.mockReturnValue(
      new Promise<{ success: true }>((r) => {
        resolve = r;
      })
    );
    render(<WantToLearnButton songId={SONG_ID} initial={{ kind: 'absent' }} />);

    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);

    expect(addMock).toHaveBeenCalledTimes(1);
    resolve({ success: true });
  });
});
