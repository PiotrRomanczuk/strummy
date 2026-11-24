/**
 * Drafted by local Gemma (gemma3:12b), corrected to the real component API
 * (named exports AIAssistButton + AIToolbar; status-driven labels; cancel-on-stream).
 */
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { AIAssistButton, AIToolbar } from '@/components/lessons/shared/AIAssistButton';

describe('AIAssistButton', () => {
  it('renders the default label', () => {
    renderWithIntl(<AIAssistButton />);
    expect(screen.getByText('AI Assist')).toBeInTheDocument();
  });

  it('shows status-driven labels', () => {
    const { rerender } = renderWithIntl(<AIAssistButton status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    rerender(<AIAssistButton status="streaming" />);
    expect(screen.getByText('Streaming...')).toBeInTheDocument();
    rerender(<AIAssistButton loading />);
    expect(screen.getByText('Working...')).toBeInTheDocument();
  });

  it('invokes onClick when not streaming', () => {
    const onClick = jest.fn();
    renderWithIntl(<AIAssistButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onCancel instead of onClick while streaming', () => {
    const onClick = jest.fn();
    const onCancel = jest.fn();
    renderWithIntl(<AIAssistButton status="streaming" onClick={onClick} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows a token badge while streaming', () => {
    renderWithIntl(<AIAssistButton status="streaming" tokenCount={42} onCancel={jest.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    renderWithIntl(<AIAssistButton disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('AIToolbar', () => {
  it('renders action chips and fires their onClick', () => {
    const onClick = jest.fn();
    renderWithIntl(<AIToolbar actions={[{ id: 'a', label: 'Summarize', onClick }]} />);
    const chip = screen.getByText('Summarize');
    expect(chip).toBeInTheDocument();
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
