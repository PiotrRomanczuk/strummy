/**
 * StudentDetailRepertoire — teacher/admin repertoire status-override UI.
 * Verifies the audit fix for spec 05 item 2.2: the status <select> only renders
 * for staff viewers (canEdit) and, on change, calls updateRepertoireEntryAction
 * with the repertoire row id + { current_status }.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { StudentRepertoireRow } from '@/lib/services/student-detail-queries';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ refresh: mockRefresh })),
}));

const mockUpdateRepertoireEntryAction = jest.fn();
jest.mock('@/app/actions/repertoire', () => ({
  updateRepertoireEntryAction: (...args: unknown[]) => mockUpdateRepertoireEntryAction(...args),
}));

import { StudentDetailRepertoire } from '@/components/users/StudentDetail.Repertoire';
import { renderWithIntl as render } from '@/lib/testing/intl-test-utils';

const buildRow = (overrides: Partial<StudentRepertoireRow> = {}): StudentRepertoireRow => ({
  id: 'repertoire-1',
  songId: 'song-1',
  songTitle: 'Wonderwall',
  songAuthor: 'Oasis',
  status: 'to_learn',
  totalPracticeMinutes: 42,
  lastPracticedAt: null,
  ...overrides,
});

describe('StudentDetailRepertoire', () => {
  beforeEach(() => {
    mockUpdateRepertoireEntryAction.mockReset();
    mockRefresh.mockReset();
  });

  it('does not render the status select when canEdit is false', () => {
    render(<StudentDetailRepertoire repertoire={[buildRow()]} canEdit={false} />);

    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // Read-only label text is still shown
    expect(screen.getByText('To learn')).toBeInTheDocument();
  });

  it('renders the status select when canEdit is true and saves on change', async () => {
    mockUpdateRepertoireEntryAction.mockResolvedValue({ success: true });

    render(<StudentDetailRepertoire repertoire={[buildRow()]} canEdit={true} />);

    const select = screen.getByRole('combobox', { name: /status for wonderwall/i });
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'mastered' } });

    await waitFor(() => {
      expect(mockUpdateRepertoireEntryAction).toHaveBeenCalledWith('repertoire-1', {
        current_status: 'mastered',
      });
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('reverts the selection and shows an error when the action fails', async () => {
    mockUpdateRepertoireEntryAction.mockResolvedValue({ error: 'Nope' });

    render(<StudentDetailRepertoire repertoire={[buildRow()]} canEdit={true} />);

    const select: HTMLSelectElement = screen.getByRole('combobox', {
      name: /status for wonderwall/i,
    });
    fireEvent.change(select, { target: { value: 'mastered' } });

    await waitFor(() => {
      expect(screen.getByText('Nope')).toBeInTheDocument();
    });
    expect(select.value).toBe('to_learn');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('renders the empty state when there is no repertoire', () => {
    render(<StudentDetailRepertoire repertoire={[]} canEdit={true} />);
    expect(screen.getByText('No songs assigned yet.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
