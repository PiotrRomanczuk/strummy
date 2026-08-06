import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import { SongFormUltimateGuitarImport } from './SongForm.UltimateGuitarImport';

/** Synthetic stand-in for a UG page — same chrome and layout, invented song. */
const PAGE = [
  'Rain On The Rooftop Chords by The Paper Kites',
  '31,729 views, added to favorites 1,415 times',
  'Difficulty:Intermediate',
  'Capo:2nd fret',
  'Chords',
  'C',
  'Em',
  'Am',
  'Strumming',
  'EditAre these strumming patterns correct?',
  '1',
  '2',
  '[Verse 1]',
  'C           Em  Am',
  '  a placeholder lyric line',
].join('\n');

const open = () => fireEvent.click(screen.getByRole('button', { name: /Paste from Ultimate/i }));
const paste = (text: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
const parse = () => fireEvent.click(screen.getByRole('button', { name: 'Parse' }));

describe('SongFormUltimateGuitarImport', () => {
  it('is collapsed until the heading is clicked', () => {
    renderWithIntl(<SongFormUltimateGuitarImport onApply={jest.fn()} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    open();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('cannot parse an empty textarea', () => {
    renderWithIntl(<SongFormUltimateGuitarImport onApply={jest.fn()} />);
    open();

    expect(screen.getByRole('button', { name: 'Parse' })).toBeDisabled();
  });

  it('shows what was recognised before anything is applied', () => {
    const onApply = jest.fn();
    renderWithIntl(<SongFormUltimateGuitarImport onApply={onApply} />);
    open();
    paste(PAGE);
    parse();

    expect(screen.getByText('Found')).toBeInTheDocument();
    expect(screen.getByText('Rain On The Rooftop')).toBeInTheDocument();
    expect(screen.getByText('The Paper Kites')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('C Em Am')).toBeInTheDocument();
    expect(screen.getByText('Key')).toBeInTheDocument();
    expect(screen.getByText('3 lines')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('hands the parsed draft to the form only when Apply is clicked', () => {
    const onApply = jest.fn();
    renderWithIntl(<SongFormUltimateGuitarImport onApply={onApply} />);
    open();
    paste(PAGE);
    parse();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rain On The Rooftop',
        author: 'The Paper Kites',
        level: 'intermediate',
        key: 'C',
        capoFret: 2,
        chords: ['C', 'Em', 'Am'],
      })
    );
  });

  it('collapses and clears itself after applying', () => {
    renderWithIntl(<SongFormUltimateGuitarImport onApply={jest.fn()} />);
    open();
    paste(PAGE);
    parse();
    fireEvent.click(screen.getByRole('button', { name: 'Apply to form' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    open();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('re-arms the Parse button when the paste is edited', () => {
    renderWithIntl(<SongFormUltimateGuitarImport onApply={jest.fn()} />);
    open();
    paste(PAGE);
    parse();
    expect(screen.getByRole('button', { name: 'Apply to form' })).toBeInTheDocument();

    paste(`${PAGE}\nEm`);
    expect(screen.getByRole('button', { name: 'Parse' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply to form' })).not.toBeInTheDocument();
  });

  it('says so, and offers no Apply, when nothing is recognised', () => {
    renderWithIntl(<SongFormUltimateGuitarImport onApply={jest.fn()} />);
    open();
    // Page chrome with no song content behind it — the strumming widget alone.
    paste(['Strumming', 'EditAre these strumming patterns correct?', '1', '2'].join('\n'));
    parse();

    expect(screen.getByText(/Nothing recognised/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply to form' })).not.toBeInTheDocument();
  });

  it('discards the paste without touching the form', () => {
    const onApply = jest.fn();
    renderWithIntl(<SongFormUltimateGuitarImport onApply={onApply} />);
    open();
    paste(PAGE);
    parse();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByText('Found')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
