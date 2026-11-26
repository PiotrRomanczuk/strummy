/**
 * Drafted by local Gemma (gemma3:12b), corrected: mock useAIStream + server action.
 */
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { LessonNotesAI } from '@/components/lessons/form/LessonNotesAI';
import { useAIStream } from '@/hooks/useAIStream';

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
jest.mock('@/app/actions/ai', () => ({ generateLessonNotesStream: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

const baseProps = {
  studentName: 'Emma',
  songsCovered: ['Wonderwall'],
  lessonTopic: 'Barre chords',
  onNotesGenerated: jest.fn(),
};

describe('LessonNotesAI', () => {
  it('renders the generate button', () => {
    renderWithIntl(<LessonNotesAI {...baseProps} />);
    expect(screen.getByText('Generate Lesson Notes')).toBeInTheDocument();
  });

  it('leaves the field alone when generation starts or fails', () => {
    renderWithIntl(<LessonNotesAI {...baseProps} />);
    fireEvent.click(screen.getByText('Generate Lesson Notes'));

    const options = jest.mocked(useAIStream).mock.calls[0][1];
    options?.onError?.(new Error('HTTP 402'));

    expect(baseProps.onNotesGenerated).not.toHaveBeenCalled();
  });

  it('starts streaming when clicked with valid input', () => {
    renderWithIntl(<LessonNotesAI {...baseProps} />);
    fireEvent.click(screen.getByText('Generate Lesson Notes'));
    expect(mockStart).toHaveBeenCalled();
  });

  it('disables the button when required fields are missing', () => {
    renderWithIntl(<LessonNotesAI {...baseProps} lessonTopic="" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
