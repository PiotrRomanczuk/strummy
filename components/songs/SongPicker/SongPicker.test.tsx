import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SongPicker } from './SongPicker';
import { filterSongs } from './song-picker.helpers';

const songs = [
  { id: 'sg1', title: 'Blackbird', author: 'The Beatles', level: 'intermediate' },
  { id: 'sg2', title: 'Landslide', author: 'Fleetwood Mac', level: null },
  { id: 'sg3', title: 'Bird on the Wire', author: 'Leonard Cohen', level: 'advanced' },
  { id: 'sg4', title: 'Żółte Kalendarze', author: 'Andrzej Piaseczny', level: 'beginner' },
];

const setup = (selectedIds: string[] = []) => {
  const onChange = jest.fn();
  render(
    <SongPicker songs={songs} selectedIds={selectedIds} onChange={onChange} inputId="picker" />
  );
  return { onChange, input: screen.getByRole('textbox') };
};

describe('filterSongs', () => {
  it('returns everything for an empty query', () => {
    expect(filterSongs(songs, '  ')).toHaveLength(4);
  });

  it('matches title and author, ranking title-prefix hits first', () => {
    expect(filterSongs(songs, 'bird').map((s) => s.id)).toEqual(['sg3', 'sg1']);
    expect(filterSongs(songs, 'cohen').map((s) => s.id)).toEqual(['sg3']);
  });

  it('matches all tokens across title + author, in any order', () => {
    expect(filterSongs(songs, 'beatles blackbird').map((s) => s.id)).toEqual(['sg1']);
    expect(filterSongs(songs, 'blackbird zeppelin')).toEqual([]);
  });

  it('ignores case and diacritics', () => {
    expect(filterSongs(songs, 'ZOLTE').map((s) => s.id)).toEqual(['sg4']);
  });
});

describe('SongPicker', () => {
  it('lists every song as a selectable option', () => {
    setup();
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByText('Blackbird')).toBeInTheDocument();
    expect(screen.getByText('The Beatles')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('filters the list as the teacher types', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'cohen' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Bird on the Wire')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'nirvana' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(/No songs match/)).toBeInTheDocument();
  });

  it('adds a song on click and appends it to the existing selection', () => {
    const { onChange } = setup(['sg2']);
    fireEvent.click(screen.getByRole('option', { name: /Blackbird/ }));
    expect(onChange).toHaveBeenCalledWith(['sg2', 'sg1']);
  });

  it('removes an already-selected song when its row is clicked again', () => {
    const { onChange } = setup(['sg1', 'sg2']);
    fireEvent.click(screen.getByRole('option', { name: /Blackbird/ }));
    expect(onChange).toHaveBeenCalledWith(['sg2']);
  });

  it('marks selected rows with aria-selected', () => {
    setup(['sg2']);
    expect(screen.getByRole('option', { name: /Landslide/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: /Blackbird/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('removes a song from the chip row', () => {
    const { onChange } = setup(['sg1', 'sg2']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Blackbird' }));
    expect(onChange).toHaveBeenCalledWith(['sg2']);
  });

  it('clears the whole selection', () => {
    const { onChange } = setup(['sg1', 'sg2']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps selected songs visible as chips while the list is filtered', () => {
    const onChange = jest.fn();
    render(<SongPicker songs={songs} selectedIds={['sg1']} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'landslide' } });

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove Blackbird' })).toBeInTheDocument();
  });

  it('toggles the highlighted row with Enter and never submits the form', () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    const onChange = jest.fn();
    render(
      <form onSubmit={onSubmit}>
        <SongPicker songs={songs} selectedIds={[]} onChange={onChange} />
      </form>
    );
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['sg2']);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('moves the keyboard cursor with the arrow keys and stops at the ends', () => {
    const { input, onChange } = setup();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['sg1']);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['sg3']);
  });

  it('points aria-activedescendant at the highlighted option', () => {
    const { input } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(screen.getByRole('option', { name: /Landslide/ })).toHaveAttribute('id', active);
  });

  it('clears the query with Escape and with the clear button', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'cohen' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'cohen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('reports how many songs are selected and shown', () => {
    const { input } = setup(['sg1']);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'bird' } });
    expect(screen.getByText('1 selected · 2 of 4 shown')).toBeInTheDocument();
  });

  it('disables the search box and shows a hint when the library is empty', () => {
    render(<SongPicker songs={[]} selectedIds={[]} onChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText('No songs in the library yet.')).toBeInTheDocument();
  });
});
