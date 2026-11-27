import { fireEvent, render, screen } from '@testing-library/react';

import { UserEditFormAccount } from './UserEditForm.Account';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const noop = () => undefined;
const baseProps = {
  isAdmin: false,
  isTeacher: false,
  isStudent: true,
  isActive: true,
  studentStatus: 'active' as const,
  onIsAdmin: noop,
  onIsTeacher: noop,
  onIsStudent: noop,
  onIsActive: noop,
};

describe('UserEditFormAccount (#1178)', () => {
  it('shows role toggles and the account switch to an admin', () => {
    render(<UserEditFormAccount {...baseProps} onStudentStatus={noop} />);
    expect(screen.getByText('accountRolesLabel')).toBeInTheDocument();
    expect(screen.getByText('accountActiveToggleLabel')).toBeInTheDocument();
  });

  it('gives a teacher only the student status, so they can archive', () => {
    const onStudentStatus = jest.fn();
    render(
      <UserEditFormAccount
        {...baseProps}
        canManageAccount={false}
        onStudentStatus={onStudentStatus}
      />
    );
    expect(screen.queryByText('accountRolesLabel')).toBeNull();
    expect(screen.queryByText('accountActiveToggleLabel')).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'archived' } });
    expect(onStudentStatus).toHaveBeenCalledWith('archived');
  });
});
