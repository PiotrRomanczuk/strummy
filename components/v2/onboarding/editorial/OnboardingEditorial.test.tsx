/**
 * Component tests: OnboardingEditorial wizard shell.
 *
 * Covers role branching, the teacher studio step with its live preview, the
 * student "guitar journey" step, and the final persistence call.
 *
 * @see components/v2/onboarding/editorial/OnboardingEditorial.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockSave = jest.fn();
jest.mock('@/app/actions/onboarding-editorial', () => ({
  saveOnboardingEditorial: (...args: unknown[]) => mockSave(...args),
}));

import { OnboardingEditorial } from './OnboardingEditorial';

const setup = (firstName?: string) => {
  const user = userEvent.setup();
  render(<OnboardingEditorial firstName={firstName} />);
  return user;
};

const clickButton = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('button', { name }));

describe('OnboardingEditorial', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockSave.mockResolvedValue({ ok: true });
  });

  it('opens on the role step with the primary action disabled', () => {
    setup();
    expect(screen.getByRole('heading', { name: /What brings you to Strummy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I want to learn/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I teach guitar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
  });

  it('routes the teacher branch: role → about → studio, updating the rail', async () => {
    const user = setup();
    await clickButton(user, /I teach guitar/);
    expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled();

    await clickButton(user, /Continue/);
    expect(screen.getByRole('heading', { name: /About you/ })).toBeInTheDocument();

    // Name is required to advance past "About you".
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
    await user.type(screen.getByLabelText('Your name'), 'Sarah Chen');
    await clickButton(user, /Continue/);

    expect(screen.getByRole('heading', { name: /Tell us about your studio/ })).toBeInTheDocument();
    // Rail reflects the teacher path.
    expect(screen.getByText('Invite students')).toBeInTheDocument();
    expect(screen.getByText('Schedule first lesson')).toBeInTheDocument();
  });

  it('live-updates the studio preview as the teacher edits fields', async () => {
    const user = setup();
    await clickButton(user, /I teach guitar/);
    await clickButton(user, /Continue/);
    await user.type(screen.getByLabelText('Your name'), 'Sarah Chen');
    await clickButton(user, /Continue/);

    expect(screen.getByText('Live preview')).toBeInTheDocument();
    expect(screen.getByText('Your studio name')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Studio name'), 'Blue Note Studio');
    await user.type(screen.getByLabelText('Tagline'), 'Fingerstyle first');
    await user.type(screen.getByLabelText('City'), 'Austin, TX');

    expect(screen.getByText('Blue Note Studio')).toBeInTheDocument();
    expect(screen.getByText(/Fingerstyle first/)).toBeInTheDocument();
    expect(screen.getByText('Austin, TX')).toBeInTheDocument();

    // Changing the default lesson length updates the preview.
    await user.click(screen.getByRole('button', { name: /60\s*min/ }));
    expect(screen.getByText('60 min')).toBeInTheDocument();

    // Toggling a "what you teach" chip flips its pressed state.
    const electric = screen.getByRole('button', { name: /Electric/ });
    expect(electric).toHaveAttribute('aria-pressed', 'false');
    await user.click(electric);
    expect(screen.getByRole('button', { name: /Electric/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('completes the teacher flow and persists a teacher payload', async () => {
    const user = setup('Sarah');
    await clickButton(user, /I teach guitar/);
    await clickButton(user, /Continue/);
    await user.type(screen.getByLabelText('Your name'), 'Sarah Chen');
    await clickButton(user, /Continue/);
    await user.type(screen.getByLabelText('Studio name'), 'Blue Note Studio');
    await clickButton(user, /Continue/); // → invite
    await clickButton(user, /Continue/); // → schedule
    await clickButton(user, /Finish setup/); // → persist → done

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const payload = mockSave.mock.calls[0][0];
    expect(payload.role).toBe('teacher');
    expect(payload.teacher.studioName).toBe('Blue Note Studio');
    expect(payload.teacher.defaultLessonMinutes).toBe(45);
    expect(await screen.findByRole('heading', { name: /all set, Sarah/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to dashboard/ })).toHaveAttribute(
      'href',
      '/dashboard'
    );
  });

  it('routes the student branch and gates the journey step on a goal', async () => {
    const user = setup();
    await clickButton(user, /I want to learn/);
    await clickButton(user, /Continue/);

    expect(screen.getByRole('heading', { name: /Where are you with guitar/ })).toBeInTheDocument();
    expect(screen.queryByTestId('journey-summary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish setup/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Fingerstyle \/ classical/ }));
    expect(screen.getByTestId('journey-summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish setup/ })).toBeEnabled();
  });

  it('completes the student flow and persists a student payload', async () => {
    const user = setup('Emma');
    await clickButton(user, /I want to learn/);
    await clickButton(user, /Continue/);
    await user.click(screen.getByRole('button', { name: /Learn classic songs/ }));
    await user.click(screen.getByRole('button', { name: /Confident/ }));
    await clickButton(user, /Finish setup/);

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const payload = mockSave.mock.calls[0][0];
    expect(payload.role).toBe('student');
    expect(payload.student.skillLevel).toBe('intermediate');
    expect(payload.student.goals).toContain('classics');
    expect(await screen.findByRole('heading', { name: /all set, Emma/ })).toBeInTheDocument();
  });

  it('surfaces a save error and stays on the final content step', async () => {
    mockSave.mockResolvedValue({ error: 'Failed to update profile' });
    const user = setup('Emma');
    await clickButton(user, /I want to learn/);
    await clickButton(user, /Continue/);
    await user.click(screen.getByRole('button', { name: /Learn classic songs/ }));
    await clickButton(user, /Finish setup/);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update profile');
    expect(screen.getByRole('heading', { name: /Where are you with guitar/ })).toBeInTheDocument();
  });
});
