import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StudentFeaturesCard } from './StudentDetail.Features';

const mockSet = jest.fn();
jest.mock('@/app/actions/student-features', () => ({
  setStudentFeature: (...args: unknown[]) => mockSet(...args),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const toggle = () => screen.getByRole('switch', { name: 'detailFeature.song-harmony.name' });

beforeEach(() => jest.clearAllMocks());

describe('StudentFeaturesCard', () => {
  it('starts with features off for a new student', () => {
    render(<StudentFeaturesCard studentId="s1" enabledFeatures={[]} />);
    expect(toggle()).not.toBeChecked();
  });

  it('turns a feature on', async () => {
    mockSet.mockResolvedValue({});
    render(<StudentFeaturesCard studentId="s1" enabledFeatures={[]} />);

    fireEvent.click(toggle());

    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith({
        studentId: 's1',
        feature: 'song-harmony',
        isEnabled: true,
      })
    );
    await waitFor(() => expect(toggle()).toBeChecked());
  });

  it('goes back when saving fails', async () => {
    mockSet.mockResolvedValue({ error: 'Could not save' });
    render(<StudentFeaturesCard studentId="s1" enabledFeatures={['song-harmony']} />);

    fireEvent.click(toggle());

    await waitFor(() => expect(mockSet).toHaveBeenCalled());
    await waitFor(() => expect(toggle()).toBeChecked());
  });
});
