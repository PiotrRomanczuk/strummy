/**
 * The AI assistant page's two teacher cards in Polish. Prompts sent to the
 * model stay English; only the UI around them is translated.
 */
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderPolish } from '@/lib/testing/intl-test-utils';
import { EmailDraftGenerator } from './EmailDraftGenerator';
import { StudentProgressInsights } from './StudentProgressInsights';

jest.mock('@/hooks/useAIStream', () => ({
  useAIStream: jest.fn(() => ({
    status: 'idle',
    content: '',
    tokenCount: 0,
    error: null,
    reasoning: undefined,
    isStreaming: false,
    isError: false,
    start: jest.fn(),
    cancel: jest.fn(),
    reset: jest.fn(),
  })),
}));
jest.mock('@/app/actions/ai', () => ({
  generateEmailDraftStream: jest.fn(),
  analyzeStudentProgressStream: jest.fn(),
}));

const students = [{ id: 's1', full_name: 'Emma Stone', email: 'emma@example.com' }];

describe('StudentProgressInsights (pl)', () => {
  it('renders the card in Polish', () => {
    renderPolish(<StudentProgressInsights students={students} />);
    expect(screen.getByText('Wnioski AI o postępach')).toBeInTheDocument();
    expect(screen.getByText('Okres')).toBeInTheDocument();
    expect(screen.getByText('Ostatnie 30 dni')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizuj postępy' })).toBeDisabled();
    expect(
      screen.getByText('Wybierz ucznia, żeby przeanalizować jego postępy z pomocą AI')
    ).toBeInTheDocument();
    expect(screen.queryByText('Analyze Progress')).not.toBeInTheDocument();
  });
});

describe('EmailDraftGenerator (pl)', () => {
  it('renders the generator in Polish', () => {
    renderPolish(<EmailDraftGenerator students={students} />);
    expect(screen.getByText('Generator szkiców wiadomości AI')).toBeInTheDocument();
    expect(screen.getByText('Rodzaj wiadomości')).toBeInTheDocument();
    expect(screen.getByText('Przypomnienie o lekcji')).toBeInTheDocument();
    expect(screen.getByText('Data lekcji')).toBeInTheDocument();
    expect(screen.getByText('Utwory do ćwiczenia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wygeneruj szkic wiadomości/ })).toBeInTheDocument();
    expect(screen.queryByText('Lesson Reminder')).not.toBeInTheDocument();
  });
});
