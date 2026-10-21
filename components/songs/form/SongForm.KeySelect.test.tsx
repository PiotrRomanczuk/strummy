import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { SongFormKeySelect } from './SongForm.KeySelect';

describe('SongFormKeySelect', () => {
  it('offers "don\'t know" first and is not required, so no key is ever guessed', () => {
    renderWithIntl(<SongFormKeySelect value="" onChange={jest.fn()} />);
    const select = screen.getByRole('combobox');

    expect(select).not.toBeRequired();
    expect(select).toHaveValue('');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent("Don't know yet");
  });
});
