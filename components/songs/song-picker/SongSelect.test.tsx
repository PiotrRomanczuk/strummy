import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongSelect } from './SongSelect';

const songs = [
  { id: 'sg1', title: 'Blackbird', author: 'The Beatles', level: 'intermediate' },
  { id: 'sg2', title: 'Landslide', author: 'Fleetwood Mac', level: null },
  { id: 'sg3', title: 'Żółte Kalendarze', author: 'Andrzej Piaseczny', level: 'beginner' },
];

const setup = (value = '', clearLabel?: string) => {
  const onChange = jest.fn();
  renderWithIntl(
    <SongSelect
      songs={songs}
      value={value}
      onChange={onChange}
      ariaLabel="Song"
      clearLabel={clearLabel}
    >
      Pick a song
    </SongSelect>
  );
  return { onChange, trigger: screen.getByRole('button', { name: 'Song' }) };
};

describe('SongSelect', () => {
  it('opens a searchable list instead of a native select', () => {
    const { trigger } = setup();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByPlaceholderText(/Search 3 songs/)).toBeInTheDocument();
  });

  it('narrows the list as you type, ignoring diacritics', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zolte' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Żółte Kalendarze')).toBeInTheDocument();
  });

  it('reports the chosen song and closes', () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /Landslide/ }));
    expect(onChange).toHaveBeenCalledWith('sg2');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('chooses the highlighted song with Enter after a search', () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'black' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('sg1');
  });

  it('swaps to a new song when another is picked while one is selected', () => {
    const { trigger, onChange } = setup('sg1');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /Landslide/ }));
    expect(onChange).toHaveBeenCalledWith('sg2');
  });

  it('keeps a mandatory song when the current one is clicked again', () => {
    const { trigger, onChange } = setup('sg1');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: /Blackbird/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers a clear row only where "no song" is allowed', () => {
    const { trigger, onChange } = setup('sg1', 'No song');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'No song' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
