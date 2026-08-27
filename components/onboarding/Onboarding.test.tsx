/**
 * Component tests: Onboarding wizard shell.
 *
 * Covers role branching, the teacher studio step with its live preview, the
 * student "guitar journey" step, and the final persistence call.
 *
 * @see components/onboarding/Onboarding.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockSave = jest.fn();
jest.mock('@/app/actions/onboarding', () => ({
  saveOnboarding: (...args: unknown[]) => mockSave(...args),
}));

import { Onboarding } from './Onboarding';

const setup = (firstName?: string) => {
  const user = userEvent.setup();
  render(<Onboarding firstName={firstName} />);
  return user;
};

const clickButton = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('button', { name }));

describe('Onboarding', () => {
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

  it('carries the student’s guitars into the payload without gating the step', async () => {
    const user = setup('Emma');
    await clickButton(user, /I want to learn/);
    await clickButton(user, /Continue/);
    await user.click(screen.getByRole('button', { name: /Learn classic songs/ }));

    // Skippable by design — a goal alone already unlocks the step.
    expect(screen.getByRole('button', { name: /Finish setup/ })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Acoustic \(steel-string\)/ }));
    await user.click(screen.getByRole('button', { name: /^Electric$/ }));
    await clickButton(user, /Finish setup/);

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0].student.guitars).toEqual(['acoustic', 'electric']);
  });

  it('treats "no guitar yet" as exclusive of owning one, in both directions', async () => {
    const user = setup('Emma');
    await clickButton(user, /I want to learn/);
    await clickButton(user, /Continue/);
    await user.click(screen.getByRole('button', { name: /Learn classic songs/ }));

    await user.click(screen.getByRole('button', { name: /Acoustic \(steel-string\)/ }));
    // Picking "none" clears the instruments...
    await user.click(screen.getByRole('button', { name: /I don't have one yet/ }));
    // ...and picking an instrument clears "none".
    await user.click(screen.getByRole('button', { name: /^Bass$/ }));
    await clickButton(user, /Finish setup/);

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0].student.guitars).toEqual(['bass']);
  });

  it('carries the teacher’s guitars into the payload', async () => {
    const user = setup('Sarah');
    await clickButton(user, /I teach guitar/);
    await clickButton(user, /Continue/);
    await user.type(screen.getByLabelText('Your name'), 'Sarah Chen');
    await user.click(screen.getByRole('button', { name: /Classical \(nylon\)/ }));
    await clickButton(user, /Continue/); // → studio
    await user.type(screen.getByLabelText('Studio name'), 'Blue Note Studio');
    await clickButton(user, /Continue/); // → invite
    await clickButton(user, /Continue/); // → schedule
    await clickButton(user, /Finish setup/);

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][0].teacher.guitars).toEqual(['classical']);
  });

  it('agrees with itself about how many steps there are', async () => {
    // The step eyebrow used to be hardcoded per step ("Step 2 of 5") while the
    // rail counted the real array (6), so production showed "STEP 2 OF 5"
    // directly above "Step 2 of 6" for the whole teacher flow. Both now derive
    // from the same source; this pins that they can never disagree again.
    const user = setup();
    await clickButton(user, /I teach guitar/);
    await clickButton(user, /Continue/); // → about

    const counters = screen.getAllByText(/Step \d+ of \d+/i).map((el) =>
      el
        .textContent!.match(/Step (\d+) of (\d+)/i)!
        .slice(1, 3)
        .join('/')
    );

    expect(counters.length).toBeGreaterThan(1);
    expect(new Set(counters).size).toBe(1);
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
