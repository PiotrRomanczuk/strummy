/**
 * StudentPicker — filterable multi-select checkbox list used by the song
 * detail page's Quick Assign widget.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';

import { StudentPicker } from '@/components/users/student-picker/StudentPicker';

const STUDENTS = [
  { id: 's1', name: 'Emma J.', email: 'emma@example.com' },
  { id: 's2', name: 'Lily P.', email: 'lily@example.com' },
  { id: 's3', name: null, email: 'noname@example.com' },
];

describe('StudentPicker', () => {
  it('renders every student option', () => {
    renderWithIntl(<StudentPicker students={STUDENTS} selectedIds={[]} onChange={jest.fn()} />);

    expect(screen.getByTestId('student-option-s1')).toBeInTheDocument();
    expect(screen.getByTestId('student-option-s2')).toBeInTheDocument();
    expect(screen.getByTestId('student-option-s3')).toBeInTheDocument();
  });

  it('falls back to email when a student has no name', () => {
    renderWithIntl(<StudentPicker students={STUDENTS} selectedIds={[]} onChange={jest.fn()} />);
    expect(screen.getByTestId('student-option-s3')).toHaveTextContent('noname@example.com');
  });

  it('filters the list by the search query', () => {
    renderWithIntl(<StudentPicker students={STUDENTS} selectedIds={[]} onChange={jest.fn()} />);

    fireEvent.change(screen.getByTestId('student-picker-search'), { target: { value: 'emma' } });

    expect(screen.getByTestId('student-option-s1')).toBeInTheDocument();
    expect(screen.queryByTestId('student-option-s2')).not.toBeInTheDocument();
  });

  it('calls onChange with the id added when an unselected option is clicked', () => {
    const onChange = jest.fn();
    renderWithIntl(<StudentPicker students={STUDENTS} selectedIds={['s1']} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('student-option-s2'));

    expect(onChange).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('calls onChange with the id removed when a selected chip is removed', () => {
    const onChange = jest.fn();
    renderWithIntl(
      <StudentPicker students={STUDENTS} selectedIds={['s1', 's2']} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: /remove emma/i }));

    expect(onChange).toHaveBeenCalledWith(['s2']);
  });
});
