/**
 * Component tests: ChordQuiz (top-level orchestrator + child render tree)
 *
 * Only chord-quiz.helpers.ts (pure logic) was covered before this file — see
 * chord-quiz.helpers.unit.test.ts. This suite renders the real component tree
 * (ChordQuiz -> useChordQuiz -> ChordQuiz.TopBar / ChordQuiz.Question /
 * ChordQuiz.Results -> ChordDiagram) to verify question presentation, answer
 * feedback, question progression, the top bar (close link, progress, running
 * hearts, streak), the results summary, and SRS-session persistence wiring.
 *
 * @see components/skills/ChordQuiz/ChordQuiz.tsx
 * @see tests/e2e/student/chord-quiz-srs.spec.ts (C1.1-C1.6 — real-account flow)
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { ChordQuiz } from './ChordQuiz';
import { submitChordQuizSession } from '@/app/actions/chord-quiz';

jest.mock('@/app/actions/chord-quiz', () => ({
  submitChordQuizSession: jest.fn(),
}));

const mockSubmit = submitChordQuizSession as jest.Mock;

// A small, stable 4-chord pool (all real CHORD_VOICINGS ids) so a "drill"
// keeps every completion test short and deterministic in length (4
// questions), while question *order* and *option shuffle* stay real/random —
// answers are resolved dynamically from the rendered chord diagram below.
const DRILL_CHORD_IDS = ['C-open', 'G-open', 'Am-open', 'E-open'];
const drill = { assignmentId: 'assignment-1', chordIds: DRILL_CHORD_IDS };

/**
 * Reads the ground-truth chord name off the diagram's `data-chord-name`.
 * Not the accessible label: that's intentionally generic while the name is
 * hidden ("Chord diagram", no name) so screen-reader users aren't handed the
 * answer the quiz is testing them on.
 */
function getCurrentChordName(): string {
  const diagram = screen.getByRole('img');
  return diagram.closest<HTMLElement>('[data-chord-name]')?.dataset.chordName ?? '';
}

/**
 * The 4 keyed answer buttons. The Random/Review mode toggle also uses
 * aria-pressed, so scope to the choice class rather than the pressed state.
 */
function getOptionButtons(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button.ui-quiz-choice'));
}

/** The option's chord name — the button also holds its aria-hidden "1"–"4" key. */
function optionLabel(btn: HTMLElement): string {
  return btn.querySelector('span:not([aria-hidden])')?.textContent ?? '';
}

async function answerCurrentQuestion(user: UserEvent, choice: 'correct' | 'incorrect') {
  const chordName = getCurrentChordName();
  const options = getOptionButtons();
  const target =
    choice === 'correct'
      ? options.find((btn) => optionLabel(btn) === chordName)
      : options.find((btn) => optionLabel(btn) !== chordName);
  if (!target) throw new Error(`Could not find a "${choice}" option button`);
  await user.click(target);
  return chordName;
}

function clickAdvance(user: UserEvent) {
  return user.click(screen.getByRole('button', { name: /next question|see results/i }));
}

describe('ChordQuiz', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ success: true, inserted: 1 });
  });

  it('renders the first question with a chord diagram and four answer options', () => {
    renderWithIntl(<ChordQuiz />);

    expect(screen.getByRole('heading', { name: 'Which chord is this?' })).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 10 · Name the chord')).toBeInTheDocument();

    const diagram = screen.getByRole('img');
    expect(diagram.getAttribute('aria-label')).toMatch(/chord diagram$/i);

    expect(getOptionButtons()).toHaveLength(4);
    getOptionButtons().forEach((btn, i) =>
      expect(btn.querySelector('.ui-quiz-key')).toHaveTextContent(String(i + 1))
    );
    // No feedback or "next" control until an answer is picked.
    expect(screen.queryByText(/^Correct!$/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next question|see results/i })
    ).not.toBeInTheDocument();
  });

  it('shows "Correct!" feedback and a Next button when the correct answer is selected', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    const chordName = await answerCurrentQuestion(user, 'correct');

    expect(await screen.findByText('Correct!')).toBeInTheDocument();
    const picked = getOptionButtons().find((btn) => optionLabel(btn) === chordName);
    expect(picked).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    // Options lock once revealed.
    for (const option of getOptionButtons()) {
      expect(option).toBeDisabled();
    }
    // A right answer keeps every heart; progress moves with the answer.
    expect(screen.getByTestId('quiz-hearts')).toHaveAccessibleName('5 hearts left');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('picks an answer with the number keys', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    const second = optionLabel(getOptionButtons()[1]);
    await user.keyboard('2');

    const picked = getOptionButtons().find((btn) => optionLabel(btn) === second);
    expect(picked).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
  });

  it('closes back to the skills hub, or to the assignment for a drill', () => {
    const { unmount } = renderWithIntl(<ChordQuiz />);
    expect(screen.getByRole('link', { name: 'Leave quiz' })).toHaveAttribute(
      'href',
      '/dashboard/skills'
    );
    unmount();

    renderWithIntl(<ChordQuiz drill={drill} />);
    expect(screen.getByRole('link', { name: 'Leave quiz' })).toHaveAttribute(
      'href',
      `/dashboard/assignments/${drill.assignmentId}`
    );
    expect(
      screen.getByText('Assigned by your teacher — name each chord to complete it.')
    ).toBeInTheDocument();
  });

  it('shows the correct answer and marks the picked option when an incorrect option is selected', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    const chordName = await answerCurrentQuestion(user, 'incorrect');

    expect(await screen.findByText(`Correct answer: ${chordName}`)).toBeInTheDocument();
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument();
  });

  it('advances to the next question when "Next question" is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    expect(
      screen.getByText(`Question 1 of ${DRILL_CHORD_IDS.length} · Name the chord`)
    ).toBeInTheDocument();
    await answerCurrentQuestion(user, 'correct');
    await clickAdvance(user);

    expect(
      screen.getByText(`Question 2 of ${DRILL_CHORD_IDS.length} · Name the chord`)
    ).toBeInTheDocument();
    // Fresh question: answering phase reset, no stale feedback, options re-enabled.
    expect(screen.queryByText(/^Correct!$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument();
    for (const option of getOptionButtons()) {
      expect(option).toBeEnabled();
    }
  });

  it('shows the Random/Review mode toggle when due chords are supplied, and switches the pool', async () => {
    const user = userEvent.setup();
    // 5 due chords with distinct names — review mode (unlike drill mode) draws
    // distractors from the pool's own names, so it needs >= 4 unique names or
    // pickDistractors throws (matches tests/e2e/student/chord-quiz-srs.spec.ts).
    const dueChordIds = ['C-open', 'G-open', 'Am-open', 'Em-open', 'D-open'];
    renderWithIntl(<ChordQuiz dueChordIds={dueChordIds} />);

    // Review mode is the default whenever dueChordIds is non-empty.
    expect(
      screen.getByText(`Question 1 of ${dueChordIds.length} · Name the chord`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Review (${dueChordIds.length} due)` })
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Random' }));

    expect(screen.getByRole('button', { name: 'Random' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Question 1 of 10 · Name the chord')).toBeInTheDocument();
  });

  it('completes a drill, shows the score summary, and submits attempts for the assignment', async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<ChordQuiz drill={drill} />);
    const total = DRILL_CHORD_IDS.length;

    for (let i = 0; i < DRILL_CHORD_IDS.length; i++) {
      // First question wrong, the rest correct — exercises both branches and
      // guarantees a non-zero "missed" list on the results screen.
      await answerCurrentQuestion(user, i === 0 ? 'incorrect' : 'correct');
      await clickAdvance(user);
    }

    // Results screen: accuracy hero + "N of M correct". A bare digit isn't
    // unique on this screen (the chord strips render SVG finger-position labels
    // like "3"), so scope the percentage to the score element itself.
    await screen.findByText('Solid — drill the missed ones.');
    expect(screen.getByText('Session complete')).toBeInTheDocument();
    expect(container.querySelector('.ui-quiz-score')).toHaveTextContent('75%');
    expect(screen.getByText(`${total - 1} of ${total} correct`)).toBeInTheDocument();
    expect(screen.getByText('Got right')).toBeInTheDocument();
    expect(screen.getByText('Need work')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const [attempts, assignmentId] = mockSubmit.mock.calls[0];
    expect(assignmentId).toBe(drill.assignmentId);
    expect(attempts).toHaveLength(DRILL_CHORD_IDS.length);
    expect(attempts.filter((a: { is_correct: boolean }) => a.is_correct)).toHaveLength(
      DRILL_CHORD_IDS.length - 1
    );
    for (const attempt of attempts) {
      expect(DRILL_CHORD_IDS).toContain(attempt.chord_id);
      expect(typeof attempt.selected_answer).toBe('string');
      expect(typeof attempt.response_time_ms).toBe('number');
    }

    await screen.findByText('Results saved.');
    expect(screen.getByRole('link', { name: /back to assignment/i })).toHaveAttribute(
      'href',
      `/dashboard/assignments/${drill.assignmentId}`
    );
  });

  it('shows an inline error when saving the results fails', async () => {
    mockSubmit.mockResolvedValueOnce({ error: 'Network error' });
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    for (let i = 0; i < DRILL_CHORD_IDS.length; i++) {
      await answerCurrentQuestion(user, 'correct');
      await clickAdvance(user);
    }

    expect(await screen.findByText('Could not save results: Network error')).toBeInTheDocument();
  });

  it('restarts the quiz from question 1 when "Play again" is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} />);

    for (let i = 0; i < DRILL_CHORD_IDS.length; i++) {
      await answerCurrentQuestion(user, 'correct');
      await clickAdvance(user);
    }
    // A perfect run — wait for the score copy and the async save to settle
    // before restarting, so the submit promise doesn't resolve after the test.
    await screen.findByText('Perfect round.');
    await screen.findByText('Results saved.');
    // No "Need work" strip on a perfect run.
    expect(screen.queryByText('Need work')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /play again/i }));

    expect(
      screen.getByText(`Question 1 of ${DRILL_CHORD_IDS.length} · Name the chord`)
    ).toBeInTheDocument();
    expect(getOptionButtons()).toHaveLength(4);
  });

  it('offers "Continue" back to the skills hub after a free-play session', async () => {
    const user = userEvent.setup();
    // Review mode over five due chords keeps the session short (5 questions).
    const dueChordIds = ['C-open', 'G-open', 'Am-open', 'Em-open', 'D-open'];
    renderWithIntl(<ChordQuiz dueChordIds={dueChordIds} />);

    for (let i = 0; i < dueChordIds.length; i++) {
      await answerCurrentQuestion(user, 'correct');
      await clickAdvance(user);
    }
    await screen.findByText('Results saved.');

    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute(
      'href',
      '/dashboard/skills'
    );
    expect(mockSubmit.mock.calls[0][1]).toBeUndefined();
  });

  it('ends a free-play round early when the last heart is lost, and shows XP + streak', async () => {
    const user = userEvent.setup();
    // Six due chords: five misses empty the hearts before the round is over.
    const dueChordIds = ['C-open', 'G-open', 'Am-open', 'Em-open', 'D-open', 'E-open'];
    const { rerender } = renderWithIntl(<ChordQuiz dueChordIds={dueChordIds} streak={3} />);

    for (let i = 0; i < 5; i++) {
      await answerCurrentQuestion(user, 'incorrect');
      expect(screen.getByTestId('quiz-hearts')).toHaveTextContent(String(4 - i));
      await clickAdvance(user);
    }

    await screen.findByText('Out of hearts — the round ends here.');
    // Saving revalidates the page; the refreshed props must not rewrite the summary.
    rerender(<ChordQuiz dueChordIds={dueChordIds} streak={4} hasPlayedToday />);
    expect(mockSubmit.mock.calls[0][0]).toHaveLength(5);
    expect(screen.getByText('+0')).toBeInTheDocument();
    // First round today: the streak ticks up from 3.
    expect(screen.getByText('+1 from 3')).toBeInTheDocument();
    expect(screen.getByText('day streak').previousElementSibling).toHaveTextContent('4');
  });

  it('never ends a teacher drill on hearts, and credits XP per correct answer', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ChordQuiz drill={drill} streak={2} hasPlayedToday />);

    await answerCurrentQuestion(user, 'correct');
    await clickAdvance(user);
    for (let i = 1; i < DRILL_CHORD_IDS.length; i++) {
      await answerCurrentQuestion(user, 'incorrect');
      await clickAdvance(user);
    }

    await screen.findByText('Results saved.');
    expect(mockSubmit.mock.calls[0][0]).toHaveLength(DRILL_CHORD_IDS.length);
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('already counted today')).toBeInTheDocument();
  });
});
