import { fireEvent, screen } from '@testing-library/react';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongFormFieldsStrumming, parseStrummingPattern } from './SongForm.Fields.Strumming';

describe('parseStrummingPattern', () => {
  it('splits a space-separated pattern into beats and maps unknown tokens to rests', () => {
    expect(parseStrummingPattern('D D U - U')).toEqual(['D', 'D', 'U', '-', 'U']);
    expect(parseStrummingPattern('D x D')).toEqual(['D', '-', 'D']);
    expect(parseStrummingPattern('   ')).toEqual([]);
  });

  it('caps the pattern at 16 beats', () => {
    expect(parseStrummingPattern(Array(20).fill('D').join(' '))).toHaveLength(16);
  });
});

describe('SongFormFieldsStrumming', () => {
  it('cycles a beat Down → Up → rest on click and serialises', () => {
    const onChange = jest.fn();
    renderWithIntl(<SongFormFieldsStrumming value="D D" onChange={onChange} />);
    // First beat, currently "down" → clicking makes it "up".
    fireEvent.click(screen.getByRole('button', { name: /Beat 1: down/i }));
    expect(onChange).toHaveBeenCalledWith('U D');
  });

  it('adds and removes beats from the end', () => {
    const onAdd = jest.fn();
    const { rerender } = renderWithIntl(<SongFormFieldsStrumming value="D" onChange={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /Add beat/i }));
    expect(onAdd).toHaveBeenCalledWith('D D');

    const onRemove = jest.fn();
    rerender(<SongFormFieldsStrumming value="D U" onChange={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove last beat/i }));
    expect(onRemove).toHaveBeenCalledWith('D');
  });

  it('shows the empty-state hint when there is no pattern', () => {
    renderWithIntl(<SongFormFieldsStrumming value="" onChange={jest.fn()} />);
    expect(screen.getByText(/add beats/i)).toBeInTheDocument();
  });
});
