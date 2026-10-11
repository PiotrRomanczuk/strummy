/**
 * Verifies SongNotesAI is wired into the song form (the
 * redesign had orphaned it — the form had no notes field). Mocks the server
 * actions + useAIStream.
 *
 * The AI generators are hidden in production behind SHOW_AI_FEATURES; this
 * suite forces the flag on so the wiring guard stays meaningful for when the
 * feature is re-enabled.
 */
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongForm } from '@/components/songs/form/SongForm';

jest.mock('@/lib/config/features', () => ({ SHOW_AI_FEATURES: true }));
jest.mock('@/app/actions/song-form', () => ({
  createSongAction: jest.fn(),
}));
jest.mock('@/app/actions/ai', () => ({
  generateSongNotesStream: jest.fn(),
  enhanceSongNotesStream: jest.fn(),
}));

const mockStart = jest.fn();
jest.mock('@/hooks/useAIStream', () => ({
  useAIStream: jest.fn(() => ({
    status: 'idle',
    content: '',
    tokenCount: 0,
    error: null,
    reasoning: undefined,
    isStreaming: false,
    isError: false,
    start: mockStart,
    cancel: jest.fn(),
    reset: jest.fn(),
  })),
}));

beforeEach(() => jest.clearAllMocks());

describe('SongForm — AI wiring', () => {
  it('renders the notes field and the SongNotesAI generate button', () => {
    renderWithIntl(<SongForm />);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    expect(document.querySelector('textarea[name="notes"]')).toBeInTheDocument();
  });

  it('enables AI once title + author are filled and starts streaming on click', () => {
    renderWithIntl(<SongForm />);
    const generateBtn = screen.getByRole('button', { name: 'Generate' });
    expect(generateBtn).toBeDisabled();

    fireEvent.change(document.querySelector('input[name="title"]')!, {
      target: { value: 'Hotel California' },
    });
    fireEvent.change(document.querySelector('input[name="author"]')!, {
      target: { value: 'Eagles' },
    });

    expect(generateBtn).toBeEnabled();
    fireEvent.click(generateBtn);
    expect(mockStart).toHaveBeenCalled();
  });
});

describe('SongForm — phone wizard', () => {
  const stepHeading = () => screen.getByRole('heading', { name: /Canto/ });

  it('starts on Canto I · Essentials with Back disabled', () => {
    renderWithIntl(<SongForm />);
    expect(stepHeading()).toHaveTextContent('Canto I · Essentials');
    expect(screen.getByRole('button', { name: '← Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to step 1' })).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('walks Next through the four steps and ends on a Create submit button', () => {
    renderWithIntl(<SongForm />);
    const wrapper = document.querySelector('.ui-song-wizard')!;

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(stepHeading()).toHaveTextContent('Canto II · Resources');
    expect(wrapper).toHaveAttribute('data-step', '2');

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(stepHeading()).toHaveTextContent('Canto IV · Content');
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create$/ })).toHaveAttribute('type', 'submit');

    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(stepHeading()).toHaveTextContent('Canto III · Musical');
  });

  it('jumps straight to a step from the stepper', () => {
    renderWithIntl(<SongForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 3' }));
    expect(stepHeading()).toHaveTextContent('Canto III · Musical');
  });
});
