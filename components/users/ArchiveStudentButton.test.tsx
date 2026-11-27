import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ArchiveStudentButton } from './ArchiveStudentButton';

const refresh = jest.fn();
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const fetchMock = jest.fn();

describe('ArchiveStudentButton (#1178)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('archives after confirmation and refreshes the card', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(<ArchiveStudentButton userId="s1" isArchived={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'archiveStudentButton' }));
    expect(fetchMock).not.toHaveBeenCalled();

    const confirm = await screen.findByRole('alertdialog');
    fireEvent.click(
      Array.from(confirm.querySelectorAll('button')).find(
        (b) => b.textContent === 'archiveStudentButton'
      )!
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/s1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ studentStatus: 'archived' }),
      })
    );
  });

  it('restores an archived student in one click and shows a failure', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<ArchiveStudentButton userId="s1" isArchived />);
    fireEvent.click(screen.getByRole('button', { name: 'restoreStudentButton' }));
    await waitFor(() => expect(screen.getByText('archiveStudentError')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/s1',
      expect.objectContaining({
        body: JSON.stringify({ studentStatus: 'active' }),
      })
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
