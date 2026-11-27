import { render, screen } from '@testing-library/react';

import { UsersListFiltersForm } from './UsersList.FiltersForm';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const roleOptions = () =>
  Array.from(
    (screen.getByLabelText('filterRoleAriaLabel') as HTMLSelectElement).options,
    (o) => o.value
  );

describe('UsersListFiltersForm role filter (#1178)', () => {
  it('offers Teachers and Admins to an admin', () => {
    render(<UsersListFiltersForm filters={{}} />);
    expect(roleOptions()).toEqual(['', 'student', 'teacher', 'admin', 'shadow']);
  });

  it('hides Teachers and Admins from a teacher', () => {
    render(<UsersListFiltersForm filters={{}} showRoleFilters={false} />);
    expect(roleOptions()).toEqual(['', 'student', 'shadow']);
  });
});
