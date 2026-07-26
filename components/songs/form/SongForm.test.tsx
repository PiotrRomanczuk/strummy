/**
 * Verifies SongNotesAI is wired into the song form (the
 * redesign had orphaned it — the form had no notes field). Mocks the server
 * actions + useAIStream.
 *
 * The AI generators are hidden in production behind SHOW_AI_FEATURES; this
 * suite forces the flag on so the wiring guard stays meaningful for when the
 * feature is re-enabled.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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
    render(<SongForm />);
    expect(screen.getByText('Generate Song Notes')).toBeInTheDocument();
    expect(document.querySelector('textarea[name="notes"]')).toBeInTheDocument();
  });

  it('enables AI once title + author are filled and starts streaming on click', () => {
    render(<SongForm />);
    const generateBtn = screen.getByText('Generate Song Notes').closest('button')!;
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
